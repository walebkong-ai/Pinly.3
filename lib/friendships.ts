export function normalizeFriendPair(firstUserId: string, secondUserId: string) {
  return firstUserId < secondUserId
    ? { userAId: firstUserId, userBId: secondUserId }
    : { userAId: secondUserId, userBId: firstUserId };
}

export function isSameNormalizedPair(
  userAId: string,
  userBId: string,
  targetAId: string,
  targetBId: string
) {
  const normalized = normalizeFriendPair(userAId, userBId);
  return normalized.userAId === targetAId && normalized.userBId === targetBId;
}
