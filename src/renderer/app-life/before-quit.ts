import {appPreferences} from "@renderer/modules/user-config-store";

export default function () {
    appPreferences.unwatchPersistence();
};
