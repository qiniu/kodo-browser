import React, {useEffect, useState} from "react";

import {app} from "@common/const/app-config";

import {useI18n} from "@renderer/modules/i18n";
import {fetchLatestVersion} from "@renderer/modules/update-app";

interface AboutMenuItemProps {
  onHasNew?: () => void,
}

const AboutMenuItem: React.FC<AboutMenuItemProps> = ({
  onHasNew,
}) => {
  const {translate} = useI18n();
  const [hasNewVersion, setHasNerVersion] = useState(false);

  useEffect(() => {
    fetchLatestVersion(app.version)
      .then(latestVersion => {
        if (!latestVersion) {
          return;
        }
        setHasNerVersion(true);
        onHasNew?.();
      })
      .catch(() => {
        // toast
      });
  }, []);

  return (
    <>
      {translate("top.about")}
      {
        hasNewVersion &&
        <small className="bg-colorful ms-1 px-1 rounded">new</small>
      }
    </>
  );
};

export default AboutMenuItem;
