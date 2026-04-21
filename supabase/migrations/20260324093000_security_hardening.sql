create or replace function public.pinly_request_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'app_user_id', ''),
    nullif(auth.jwt() ->> 'sub', ''),
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('app.current_user_id', true), '')
  );
$$;

create or replace function public.pinly_are_friends(left_user_id text, right_user_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public."Friendship" friendship
    where
      (
        friendship."userAId" = left_user_id
        and friendship."userBId" = right_user_id
      )
      or (
        friendship."userBId" = left_user_id
        and friendship."userAId" = right_user_id
      )
  )
  or exists (
    select 1
    from public."FriendRequest" request
    where request.status = 'ACCEPTED'
      and (
        (request."fromUserId" = left_user_id and request."toUserId" = right_user_id)
        or (request."toUserId" = left_user_id and request."fromUserId" = right_user_id)
      )
  );
$$;

create or replace function public.pinly_users_blocked(left_user_id text, right_user_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public."Block" block_entry
    where
      (block_entry."blockerId" = left_user_id and block_entry."blockedId" = right_user_id)
      or (block_entry."blockerId" = right_user_id and block_entry."blockedId" = left_user_id)
  );
$$;

create or replace function public.pinly_can_view_user(target_user_id text)
returns boolean
language sql
stable
as $$
  select
    public.pinly_request_user_id() is not null
    and not public.pinly_users_blocked(public.pinly_request_user_id(), target_user_id)
    and (
      public.pinly_request_user_id() = target_user_id
      or public.pinly_are_friends(public.pinly_request_user_id(), target_user_id)
    );
$$;

create or replace function public.pinly_can_view_post(owner_user_id text, is_archived boolean)
returns boolean
language sql
stable
as $$
  select
    public.pinly_request_user_id() is not null
    and not public.pinly_users_blocked(public.pinly_request_user_id(), owner_user_id)
    and (
      public.pinly_request_user_id() = owner_user_id
      or (
        not is_archived
        and public.pinly_are_friends(public.pinly_request_user_id(), owner_user_id)
      )
    );
$$;

create or replace function public.pinly_can_view_collection(owner_user_id text, visibility text)
returns boolean
language sql
stable
as $$
  select
    public.pinly_request_user_id() is not null
    and not public.pinly_users_blocked(public.pinly_request_user_id(), owner_user_id)
    and (
      public.pinly_request_user_id() = owner_user_id
      or (
        visibility in ('friends', 'public')
        and public.pinly_are_friends(public.pinly_request_user_id(), owner_user_id)
      )
    );
$$;

create or replace function public.pinly_can_view_group(target_group_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public."GroupMember" membership
    where membership."groupId" = target_group_id
      and membership."userId" = public.pinly_request_user_id()
  );
$$;

create or replace function public.pinly_storage_owner_id(object_name text)
returns text
language sql
stable
as $$
  select split_part(object_name, '/', 1);
$$;

alter table public."User" enable row level security;
alter table public."FriendRequest" enable row level security;
alter table public."Friendship" enable row level security;
alter table public."Post" enable row level security;
alter table public."PostCollection" enable row level security;
alter table public."PostCollectionItem" enable row level security;
alter table public."PostVisitTag" enable row level security;
alter table public."Like" enable row level security;
alter table public."SavedPost" enable row level security;
alter table public."Notification" enable row level security;
alter table public.push_tokens enable row level security;
alter table public."WantToGoPlace" enable row level security;
alter table public."Comment" enable row level security;
alter table public."UserSettings" enable row level security;
alter table public."Group" enable row level security;
alter table public."GroupMember" enable row level security;
alter table public."GroupMessage" enable row level security;
alter table public."InviteLink" enable row level security;
alter table public."PasswordResetToken" enable row level security;
alter table public."RateLimitEvent" enable row level security;
alter table public."RateLimitBucket" enable row level security;
alter table public."Block" enable row level security;
alter table public."Report" enable row level security;

drop policy if exists "pinly_user_read_visible" on public."User";
create policy "pinly_user_read_visible"
on public."User"
for select
to authenticated
using (public.pinly_can_view_user(id));

drop policy if exists "pinly_user_write_self" on public."User";
create policy "pinly_user_write_self"
on public."User"
for update
to authenticated
using (public.pinly_request_user_id() = id)
with check (public.pinly_request_user_id() = id);

drop policy if exists "pinly_user_settings_self" on public."UserSettings";
create policy "pinly_user_settings_self"
on public."UserSettings"
for all
to authenticated
using (public.pinly_request_user_id() = "userId")
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_posts_visible" on public."Post";
create policy "pinly_posts_visible"
on public."Post"
for select
to authenticated
using (public.pinly_can_view_post("userId", "isArchived"));

drop policy if exists "pinly_posts_insert_self" on public."Post";
create policy "pinly_posts_insert_self"
on public."Post"
for insert
to authenticated
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_posts_update_self" on public."Post";
create policy "pinly_posts_update_self"
on public."Post"
for update
to authenticated
using (public.pinly_request_user_id() = "userId")
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_posts_delete_self" on public."Post";
create policy "pinly_posts_delete_self"
on public."Post"
for delete
to authenticated
using (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_collections_visible" on public."PostCollection";
create policy "pinly_collections_visible"
on public."PostCollection"
for select
to authenticated
using (public.pinly_can_view_collection("userId", visibility::text));

drop policy if exists "pinly_collections_write_self" on public."PostCollection";
create policy "pinly_collections_write_self"
on public."PostCollection"
for all
to authenticated
using (public.pinly_request_user_id() = "userId")
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_collection_items_visible" on public."PostCollectionItem";
create policy "pinly_collection_items_visible"
on public."PostCollectionItem"
for select
to authenticated
using (
  exists (
    select 1
    from public."PostCollection" collection_entry
    join public."Post" post_entry on post_entry.id = "postId"
    where collection_entry.id = "collectionId"
      and public.pinly_can_view_collection(collection_entry."userId", collection_entry.visibility::text)
      and public.pinly_can_view_post(post_entry."userId", post_entry."isArchived")
  )
);

drop policy if exists "pinly_collection_items_write_self" on public."PostCollectionItem";
create policy "pinly_collection_items_write_self"
on public."PostCollectionItem"
for all
to authenticated
using (
  exists (
    select 1
    from public."PostCollection" collection_entry
    where collection_entry.id = "collectionId"
      and collection_entry."userId" = public.pinly_request_user_id()
  )
)
with check (
  exists (
    select 1
    from public."PostCollection" collection_entry
    where collection_entry.id = "collectionId"
      and collection_entry."userId" = public.pinly_request_user_id()
  )
);

drop policy if exists "pinly_visit_tags_visible" on public."PostVisitTag";
create policy "pinly_visit_tags_visible"
on public."PostVisitTag"
for select
to authenticated
using (
  exists (
    select 1
    from public."Post" post_entry
    where post_entry.id = "postId"
      and public.pinly_can_view_post(post_entry."userId", post_entry."isArchived")
  )
);

drop policy if exists "pinly_visit_tags_write_post_owner" on public."PostVisitTag";
create policy "pinly_visit_tags_write_post_owner"
on public."PostVisitTag"
for all
to authenticated
using (
  exists (
    select 1
    from public."Post" post_entry
    where post_entry.id = "postId"
      and post_entry."userId" = public.pinly_request_user_id()
  )
)
with check (
  exists (
    select 1
    from public."Post" post_entry
    where post_entry.id = "postId"
      and post_entry."userId" = public.pinly_request_user_id()
  )
);

drop policy if exists "pinly_likes_visible" on public."Like";
create policy "pinly_likes_visible"
on public."Like"
for select
to authenticated
using (
  exists (
    select 1
    from public."Post" post_entry
    where post_entry.id = "postId"
      and public.pinly_can_view_post(post_entry."userId", post_entry."isArchived")
  )
);

drop policy if exists "pinly_likes_write_self" on public."Like";
create policy "pinly_likes_write_self"
on public."Like"
for all
to authenticated
using (public.pinly_request_user_id() = "userId")
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_saved_posts_self" on public."SavedPost";
create policy "pinly_saved_posts_self"
on public."SavedPost"
for all
to authenticated
using (public.pinly_request_user_id() = "userId")
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_notifications_self" on public."Notification";
create policy "pinly_notifications_self"
on public."Notification"
for select
to authenticated
using (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_notifications_mark_read_self" on public."Notification";
create policy "pinly_notifications_mark_read_self"
on public."Notification"
for update
to authenticated
using (public.pinly_request_user_id() = "userId")
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_push_tokens_self" on public.push_tokens;
create policy "pinly_push_tokens_self"
on public.push_tokens
for all
to authenticated
using (public.pinly_request_user_id() = "user_id")
with check (public.pinly_request_user_id() = "user_id");

drop policy if exists "pinly_want_to_go_self" on public."WantToGoPlace";
create policy "pinly_want_to_go_self"
on public."WantToGoPlace"
for all
to authenticated
using (public.pinly_request_user_id() = "userId")
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_comments_visible" on public."Comment";
create policy "pinly_comments_visible"
on public."Comment"
for select
to authenticated
using (
  exists (
    select 1
    from public."Post" post_entry
    where post_entry.id = "postId"
      and public.pinly_can_view_post(post_entry."userId", post_entry."isArchived")
  )
);

drop policy if exists "pinly_comments_write_self" on public."Comment";
create policy "pinly_comments_write_self"
on public."Comment"
for all
to authenticated
using (public.pinly_request_user_id() = "userId")
with check (public.pinly_request_user_id() = "userId");

drop policy if exists "pinly_friend_requests_participants" on public."FriendRequest";
create policy "pinly_friend_requests_participants"
on public."FriendRequest"
for select
to authenticated
using (
  public.pinly_request_user_id() = "fromUserId"
  or public.pinly_request_user_id() = "toUserId"
);

drop policy if exists "pinly_friend_requests_create_sender" on public."FriendRequest";
create policy "pinly_friend_requests_create_sender"
on public."FriendRequest"
for insert
to authenticated
with check (
  public.pinly_request_user_id() = "fromUserId"
  and "fromUserId" <> "toUserId"
);

drop policy if exists "pinly_friend_requests_update_participants" on public."FriendRequest";
create policy "pinly_friend_requests_update_participants"
on public."FriendRequest"
for update
to authenticated
using (
  public.pinly_request_user_id() = "fromUserId"
  or public.pinly_request_user_id() = "toUserId"
)
with check (
  public.pinly_request_user_id() = "fromUserId"
  or public.pinly_request_user_id() = "toUserId"
);

drop policy if exists "pinly_friendships_participants" on public."Friendship";
create policy "pinly_friendships_participants"
on public."Friendship"
for select
to authenticated
using (
  public.pinly_request_user_id() = "userAId"
  or public.pinly_request_user_id() = "userBId"
);

drop policy if exists "pinly_groups_member_read" on public."Group";
create policy "pinly_groups_member_read"
on public."Group"
for select
to authenticated
using (public.pinly_can_view_group(id));

drop policy if exists "pinly_group_members_member_read" on public."GroupMember";
create policy "pinly_group_members_member_read"
on public."GroupMember"
for select
to authenticated
using (public.pinly_can_view_group("groupId"));

drop policy if exists "pinly_group_messages_member_read" on public."GroupMessage";
create policy "pinly_group_messages_member_read"
on public."GroupMessage"
for select
to authenticated
using (public.pinly_can_view_group("groupId"));

drop policy if exists "pinly_group_messages_member_write" on public."GroupMessage";
create policy "pinly_group_messages_member_write"
on public."GroupMessage"
for insert
to authenticated
with check (
  public.pinly_request_user_id() = "userId"
  and public.pinly_can_view_group("groupId")
);

drop policy if exists "pinly_invites_self" on public."InviteLink";
create policy "pinly_invites_self"
on public."InviteLink"
for all
to authenticated
using (public.pinly_request_user_id() = "createdByUserId")
with check (public.pinly_request_user_id() = "createdByUserId");

drop policy if exists "pinly_blocks_participants" on public."Block";
create policy "pinly_blocks_participants"
on public."Block"
for select
to authenticated
using (
  public.pinly_request_user_id() = "blockerId"
  or public.pinly_request_user_id() = "blockedId"
);

drop policy if exists "pinly_blocks_create_self" on public."Block";
create policy "pinly_blocks_create_self"
on public."Block"
for insert
to authenticated
with check (
  public.pinly_request_user_id() = "blockerId"
  and "blockerId" <> "blockedId"
);

drop policy if exists "pinly_blocks_delete_self" on public."Block";
create policy "pinly_blocks_delete_self"
on public."Block"
for delete
to authenticated
using (public.pinly_request_user_id() = "blockerId");

drop policy if exists "pinly_reports_participants" on public."Report";
create policy "pinly_reports_participants"
on public."Report"
for select
to authenticated
using (
  public.pinly_request_user_id() = "reporterId"
  or public.pinly_request_user_id() = "reportedId"
);

drop policy if exists "pinly_reports_create_self" on public."Report";
create policy "pinly_reports_create_self"
on public."Report"
for insert
to authenticated
with check (public.pinly_request_user_id() = "reporterId");

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pinly_media_owner_read" on storage.objects;
create policy "pinly_media_owner_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and public.pinly_storage_owner_id(name) = public.pinly_request_user_id()
);

drop policy if exists "pinly_media_owner_insert" on storage.objects;
create policy "pinly_media_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and public.pinly_storage_owner_id(name) = public.pinly_request_user_id()
);

drop policy if exists "pinly_media_owner_update" on storage.objects;
create policy "pinly_media_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and public.pinly_storage_owner_id(name) = public.pinly_request_user_id()
)
with check (
  bucket_id = 'media'
  and public.pinly_storage_owner_id(name) = public.pinly_request_user_id()
);

drop policy if exists "pinly_media_owner_delete" on storage.objects;
create policy "pinly_media_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and public.pinly_storage_owner_id(name) = public.pinly_request_user_id()
);
