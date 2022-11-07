import React, {useEffect, useState} from "react";

import {app} from "@common/const/app-config";

import {useI18n} from "@renderer/modules/i18n";
import MarkdownView from "@renderer/modules/markdown";
import {fetchLatestVersion, fetchReleaseNote} from "@renderer/modules/update-app";
import LoadingHolder from "@renderer/components/loading-holder";

import DownloadUpdate from "./download-update";

const PreviewUpdate: React.FC = ({}) => {
  const {translate} = useI18n();

  // load the latest version release note
  const [loading, setLoading] = useState<boolean>(true);

  // markdown view
  const [releaseNote, setReleaseNote] = useState<string>();
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestVersion(app.version)
      .then(latestVersion => {
        setLatestVersion(latestVersion);
        if (!latestVersion) {
          return;
        }
        return fetchReleaseNote(latestVersion);
      })
      .then(releaseText => {
        setReleaseNote(releaseText);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // render
  if (loading) {
    return (
      <LoadingHolder
        text={translate("modals.about.updateApp.checking")}
      />
    );
  }

  if (!latestVersion) {
    return (
      <div className="text-success text-center">
        {translate("modals.about.updateApp.alreadyLatest")}
      </div>
    );
  }

  return (
    <>
      <DownloadUpdate version={latestVersion}/>
      <div className="mt-2">
        <b>{translate("modals.about.updateApp.changeLogsTitle")}</b>
        <div className="text-bg-info bg-opacity-10 p-2 small scroll-max-vh-40">
          <MarkdownView
            text={releaseNote}
          />
        </div>
      </div>
    </>
  );
};

export default PreviewUpdate;
