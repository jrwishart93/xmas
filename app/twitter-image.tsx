import { createSocialImageResponse, socialImageContentType, socialImageSize } from "@/lib/socialImage";

export const runtime = "nodejs";
export const alt = "The Social Contributions Act social preview";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default async function TwitterImage() {
  return createSocialImageResponse();
}
