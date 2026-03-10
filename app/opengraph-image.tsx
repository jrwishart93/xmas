import { createSocialImageResponse, socialImageContentType, socialImageSize } from "@/lib/socialImage";

export const runtime = "nodejs";
export const alt = "The Social Contributions Act share image";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default async function OpenGraphImage() {
  return createSocialImageResponse();
}
