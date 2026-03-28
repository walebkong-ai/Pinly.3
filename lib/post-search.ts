import type { Prisma } from "@prisma/client";

type SearchableUser = {
  name: string;
  username: string;
};

type SearchablePost = {
  placeName: string;
  city: string;
  country: string;
  caption: string;
  user: SearchableUser;
  visitedWith?: SearchableUser[] | null;
};

export function buildPostSearchTermWhere(term: string): Prisma.PostWhereInput {
  return {
    OR: [
      { placeName: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { country: { contains: term, mode: "insensitive" } },
      { caption: { contains: term, mode: "insensitive" } },
      { user: { name: { contains: term, mode: "insensitive" } } },
      { user: { username: { contains: term, mode: "insensitive" } } },
      {
        visitedWith: {
          some: {
            user: {
              name: { contains: term, mode: "insensitive" }
            }
          }
        }
      },
      {
        visitedWith: {
          some: {
            user: {
              username: { contains: term, mode: "insensitive" }
            }
          }
        }
      }
    ]
  };
}

export function getPostSearchFields(post: SearchablePost) {
  return [
    { value: post.placeName, weight: 4.5 },
    { value: post.city, weight: 4 },
    { value: post.country, weight: 3.4 },
    { value: post.user.username, weight: 3.6 },
    { value: post.user.name, weight: 3.2 },
    ...(post.visitedWith ?? []).flatMap((friend) => [
      { value: friend.username, weight: 3.5 },
      { value: friend.name, weight: 3.1 }
    ]),
    { value: post.caption, weight: 1.8 }
  ];
}
