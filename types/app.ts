export type UserSummary = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  settings?: {
    commentsEnabled: boolean;
  } | null;
};

export type CollectionSummary = {
  id: string;
  name: string;
  postCount: number;
  updatedAt: string | Date;
  previewPost: {
    id: string;
    mediaType: "IMAGE" | "VIDEO";
    mediaUrl: string;
    thumbnailUrl: string | null;
    placeName: string;
    city: string;
    country: string;
  } | null;
};

export type CollectionChip = {
  id: string;
  name: string;
};

export type WantToGoPlaceSummary = {
  id: string;
  placeName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  createdAt: string | Date;
};

export type NotificationSummary = {
  id: string;
  type:
    | "POST_LIKED"
    | "POST_COMMENTED"
    | "COMMENT_REPLIED"
    | "POST_SHARED"
    | "FRIEND_REQUEST_RECEIVED"
    | "FRIEND_REQUEST_ACCEPTED";
  createdAt: string | Date;
  readAt: string | Date | null;
  actor: UserSummary;
  post: {
    id: string;
    placeName: string;
    city: string;
    country: string;
  } | null;
  comment: {
    id: string;
    content: string;
  } | null;
  friendRequest: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED";
  } | null;
};

export type ProfileTravelSummary = {
  cityCount: number;
  countryCount: number;
  recentPlaces: Array<{
    placeName: string;
    city: string;
    country: string;
    visitedAt: string | Date;
  }>;
  recentMemories: Array<{
    id: string;
    caption: string;
    placeName: string;
    city: string;
    country: string;
    visitedAt: string | Date;
    mediaType: "IMAGE" | "VIDEO";
    mediaUrl: string;
    thumbnailUrl: string | null;
  }>;
  sharedPlaces: Array<{
    city: string;
    country: string;
  }>;
};

export type PostSummary = {
  id: string;
  userId: string;
  isArchived?: boolean;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  placeName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  visitedAt: string | Date;
  createdAt: string | Date;
  savedByViewer?: boolean;
  likedByViewer?: boolean;
  likeCount?: number;
  visitedWith?: UserSummary[];
  user: UserSummary;
};

export type LayerMode = "friends" | "you" | "both";

export type MapVisualMode = "default" | "satellite";

export type TimeFilter = "all" | "30d" | "6m" | "1y";

export type MapCategory = "photo" | "video" | "food" | "nature" | "landmark" | "neighborhood";

export type MapGroupOption = {
  id: string;
  label: string;
  description: string;
  memberIds: string[];
  kind: "friend";
};

export type MapStage = "world" | "city" | "pin" | "bubble";

export type MapFilters = {
  layer: LayerMode;
  time: TimeFilter;
  groups: string[];
  categories: MapCategory[];
};

export type MarkerPreviewPost = {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
  placeName: string;
  city: string;
  country: string;
  visitedAt: string | Date;
  user: UserSummary;
};

export type CityClusterMarker = {
  type: "cityCluster";
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  postCount: number;
  friendCount: number;
  visitors: UserSummary[];
};

export type PlaceClusterMarker = {
  type: "placeCluster";
  id: string;
  latitude: number;
  longitude: number;
  placeName: string;
  city: string;
  country: string;
  postCount: number;
  visitors: UserSummary[];
  previewPost: MarkerPreviewPost;
};

export type PinMarker = {
  type: "pin";
  id: string;
  latitude: number;
  longitude: number;
  post: PostSummary;
};

export type ProfileBubbleMarker = {
  type: "profileBubble";
  id: string;
  latitude: number;
  longitude: number;
  post: PostSummary;
};

export type MapMarker = CityClusterMarker | PlaceClusterMarker | PinMarker | ProfileBubbleMarker;

export type CityContext = {
  city: string;
  country: string;
  friendCount: number;
  visitors: UserSummary[];
  recentTrips: PostSummary[];
  center: {
    latitude: number;
    longitude: number;
  };
};

export type FriendActivityItem = {
  id: string;
  postId: string;
  user: UserSummary;
  placeName: string;
  city: string;
  country: string;
  visitedAt: string | Date;
};

export type MapResponse = {
  stage: MapStage;
  markers: MapMarker[];
  cityContext: CityContext | null;
  friendActivity: FriendActivityItem[];
};

export type PlaceSearchResult = {
  id: string;
  placeName: string;
  displayName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};
