export type UserSummary = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type PostSummary = {
  id: string;
  userId: string;
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
  user: UserSummary;
};

export type LayerMode = "friends" | "you" | "both";

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
