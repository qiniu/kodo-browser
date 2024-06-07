import {
  CheckShareOptions,
  CreateShareOptions,
  CreateShareResult,
  VerifyShareOptions,
  VerifyShareResult,
} from "kodo-s3-adapter-sdk/dist/share-service";

import {getShareService, GetShareServiceOptions} from "@renderer/modules/qiniu-client/common";

export async function getShareApiHosts(
  portalHosts: string[],
): Promise<string[]> {
  const shareService = await getShareService({});
  return await shareService.getApiHosts(portalHosts);
}

export async function createShare(
  param: CreateShareOptions,
  opt: Required<GetShareServiceOptions>,
): Promise<CreateShareResult> {
  const shareService = await getShareService(opt);
  return await shareService.createShare(param);
}

export async function checkShare(
  param: CheckShareOptions,
  opt: GetShareServiceOptions,
): Promise<void> {
  const shareService = await getShareService(opt);
  await shareService.checkShare(param);
}

export async function verifyShare(
  param: VerifyShareOptions,
  opt: GetShareServiceOptions,
): Promise<VerifyShareResult> {
  const shareService = await getShareService(opt);
  return await shareService.verifyShare(param);
}
