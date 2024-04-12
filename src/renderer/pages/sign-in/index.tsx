// libs
import React, {useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {Button, Card, Col, Container, Row} from "react-bootstrap";
import {DEFAULT_PORTAL_URL} from "kodo-s3-adapter-sdk/dist/region";

// modules
import {useI18n} from "@renderer/modules/i18n";
import * as DefaultDict from "@renderer/modules/default-dict";
import {EndpointType} from "@renderer/modules/auth";
import {useEndpointConfig} from "@renderer/modules/user-config-store";

// modals
import {useDisplayModal} from "@renderer/components/modals/hooks";
import AkHistory from "@renderer/components/modals/general/ak-history";
import PrivateCloudSettings from "@renderer/components/modals/general/private-cloud-settings";
import RoutePath, {SignInState} from "@renderer/pages/route-path";

// locals
import "./sign-in.scss";

import SignInForm, {SignInFormValues} from "./sign-in-form";
import SignInShareForm from "./sign-in-share-form";

const SignIn: React.FC = () => {
  // context states
  const {translate} = useI18n();
  const {state: routeState} = useLocation() as {
    state: SignInState
  };
  const navigate = useNavigate();
  const signInType: "ak" | "shareLink" = routeState?.type ?? "ak";

  const {
    endpointConfigState,
  } = useEndpointConfig(null);

  // modal states
  const [
    {
      show: isShowPrivateEndpointSetting,
    },
    {
      showModal: handleClickPrivateEndpointSetting,
      hideModal: handleHidePrivateEndpointSetting,
    },
  ] = useDisplayModal();
  const [
    {
      show: isShowAccessKeyHistory,
    },
    {
      showModal: handleClickAccessKeyHistory,
      hideModal: handleHideAccessKeyHistory,
    },
  ] = useDisplayModal();

  // local states
  // AK form
  const [formDefaultValues, setFormDefaultValues] = useState<SignInFormValues>({
    endpointType: EndpointType.Public,
    accessKey: "",
    accessSecret: "",
    rememberMe: false,
  });
  useEffect(() => {
    const endpointType = Object.values(EndpointType)
      .find(t => t === DefaultDict.get("LOGIN_ENDPOINT_TYPE"))
    setFormDefaultValues(v => ({
      ...v,
      endpointType: endpointType ?? EndpointType.Public,
    }))
  }, []);

  // Share Link form
  const [shareLinkFormDefaultValues, setShareLinkFormDefaultValues] = useState({
    shareLink: "",
    extractCode: "",
  });
  useEffect(() => {
    if (
      routeState?.type !== "shareLink" ||
      !routeState.data.shareId ||
      !routeState.data.shareToken
    ) {
      setShareLinkFormDefaultValues({
        shareLink: "",
        extractCode: "",
      });
      return;
    }
    const shareURL = new URL(`${DEFAULT_PORTAL_URL}/kodo-shares/verify`);
    if (routeState.data.apiHost) {
      shareURL.searchParams.set("apiHost", routeState.data.apiHost);
    }
    shareURL.searchParams.set("id", routeState.data.shareId);
    shareURL.searchParams.set("token", routeState.data.shareToken);
    setShareLinkFormDefaultValues({
      shareLink: shareURL.toString(),
      extractCode: routeState.data.extractCode || "",
    });
  }, [routeState?.type]);

  // handle events
  const handleSignInType = () => {
    if (signInType !== "ak") {
      navigate(RoutePath.SignIn);
      return;
    }

    // share link state
    const defaultShareLinkState: SignInState = {
      type: "shareLink",
      data: {
        shareId: "",
        shareToken: "",
      },
    };
    navigate(RoutePath.SignIn, {
      state: defaultShareLinkState,
    });
  };

  // render
  return (
    <Container>
      <Row>
        <Col/>
        <Col className="sign-in-page">
          <Card>
            <Card.Header as="h4">
              {
                signInType === "ak"
                  ? translate("signIn.title")
                  : translate("signIn.titleShareLink")
              }
            </Card.Header>
            <Card.Body>
              {
                signInType === "ak"
                  ? <SignInForm
                    defaultValues={formDefaultValues}
                    isInvalidPrivateEndpointSetting={!endpointConfigState.valid}
                    onClickPrivateEndpointSetting={handleClickPrivateEndpointSetting}
                    onClickAccessKeyHistory={handleClickAccessKeyHistory}
                  />
                  : <SignInShareForm
                    defaultValues={shareLinkFormDefaultValues}
                  />
              }

              <Col sm={{span: 7, offset: 4}}>
                <Button
                  size="sm"
                  variant="link"
                  onClick={() => handleSignInType()}
                >
                  {
                    signInType === "ak"
                      ? translate("signIn.gotoShareLinkForm")
                      : translate("signIn.gotoAkForm")
                  }
                </Button>
              </Col>
            </Card.Body>
          </Card>
        </Col>
        <Col/>
      </Row>
      <PrivateCloudSettings
        show={isShowPrivateEndpointSetting}
        dialogClassName="modal-720p"
        onHide={handleHidePrivateEndpointSetting}
      />
      <AkHistory
        show={isShowAccessKeyHistory}
        size="xl"
        onHide={handleHideAccessKeyHistory}
        onActiveAk={akItem => {
          setFormDefaultValues({
            ...akItem,
            rememberMe: true,
          });
          handleHideAccessKeyHistory();
        }}
      />
    </Container>
  )
};

export default SignIn;
