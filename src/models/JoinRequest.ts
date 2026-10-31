export interface JoinRequest {
  requestId: string;
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
  switching: boolean;
}
export interface MyJoinRequest {
  familyId: string;
  familyName: string;
  createdAt: string;
}
