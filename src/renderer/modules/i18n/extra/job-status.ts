import {Status} from "@common/models/job/types";
type StatusI18nKey = "transfer.jobItem.status.finished"
  | "transfer.jobItem.status.failed"
  | "transfer.jobItem.status.stopped"
  | "transfer.jobItem.status.waiting"
  | "transfer.jobItem.status.running"
  | "transfer.jobItem.status.duplicated"
  | "transfer.jobItem.status.verifying"

export const Status2I18nKey: Record<Status, StatusI18nKey> = {
  [Status.Finished]: "transfer.jobItem.status.finished",
  [Status.Failed]: "transfer.jobItem.status.failed",
  [Status.Stopped]: "transfer.jobItem.status.stopped",
  [Status.Waiting]: "transfer.jobItem.status.waiting",
  [Status.Running]: "transfer.jobItem.status.running",
  [Status.Duplicated]: "transfer.jobItem.status.duplicated",
  [Status.Verifying]: "transfer.jobItem.status.verifying",
}
