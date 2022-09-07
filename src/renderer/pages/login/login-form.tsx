import React from "react";
import {Button, Col, Form, Row, Spinner} from "react-bootstrap";
import classNames from "classnames";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";

import * as LocalLogger from "@renderer/modules/local-logger";
import {useI18n} from "@renderer/modules/i18n";
import {AkItem, EndpointType, useAuth} from "@renderer/modules/auth";

import "./login-form.scss";

export interface LoginFormValues extends AkItem {
  rememberMe: boolean,
}

const LoginForm: React.FC = () => {
  const {translate} = useI18n();
  const {signIn} = useAuth();

  const handleLogin: SubmitHandler<LoginFormValues> = (data) => {
    LocalLogger.info("logging in data", data);
    const p = signIn(data, data.rememberMe);
    return toast.promise(p, {
      loading: translate("login.form.submit"),
      success: translate("common.success"),
      error: translate("common.failed"),
    });
  };

  const {
    watch,
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginFormValues>();

  return (
    <Form className="login-form" onSubmit={handleSubmit(handleLogin)}>
      <fieldset disabled={isSubmitting}>
        <Form.Group as={Row} className="mb-3" controlId="loginEndpoint">
          <Form.Label className="text-end" column sm={4}>
            <span className="text-danger">*</span>{translate("login.form.endpoint.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Select
              {...register("endpointType")}
              isInvalid={Boolean(errors.endpointType)}
            >
              <option value={EndpointType.Public}>{translate("login.form.endpoint.options.public")}</option>
              <option value={EndpointType.Private}>{translate("login.form.endpoint.options.private")}</option>
            </Form.Select>
          </Col>
          <Col
            sm={1}
            className={
              classNames(
                "d-flex justify-content-center align-items-center",
                {
                  "visually-hidden": watch("endpointType") !== EndpointType.Private
                }
              )
            }
          >
            <Button
              variant="link"
              className="private-endpoint-setting"
              onClick={() => LocalLogger.info("open private endpoint settings")}
            >
              <i className="bi bi-gear-fill"/>
            </Button>
          </Col>
        </Form.Group>

        <Form.Group as={Row} className="mb-3" controlId="loginAccessKey">
          <Form.Label className="text-end" column sm={4}>
            <span className="text-danger">*</span>{translate("login.form.accessKeyId.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Control
              {...register("accessKey", {required: true})}
              type="text"
              placeholder={translate("login.form.accessKeyId.holder")}
              isInvalid={Boolean(errors.accessKey)}
            />
            <Form.Control.Feedback type="invalid">
              {translate("login.form.accessKeyId.feedback.required")}
            </Form.Control.Feedback>
          </Col>
        </Form.Group>

        <Form.Group as={Row} className="mb-3" controlId="loginAccessSecret">
          <Form.Label className="text-end" column sm={4}>
            <span className="text-danger">*</span>{translate("login.form.accessKeySecret.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Control
              {...register("accessSecret", {required: true})}
              type="password"
              placeholder={translate("login.form.accessKeySecret.holder")}
              isInvalid={Boolean(errors.accessSecret)}
            />
            <Form.Control.Feedback type="invalid">
              {translate("login.form.accessKeySecret.feedback.required")}
            </Form.Control.Feedback>
          </Col>
        </Form.Group>


        <Form.Group
          as={Row}
          className={classNames("mb-3", {"visually-hidden": !watch("rememberMe")})}
          controlId="loginRemark"
        >
          <Form.Label className="text-end" column sm={4}>
            {translate("login.form.description.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Control
              {...register("description", {maxLength: 20})}
              type="text"
              placeholder={translate("login.form.description.holder")}
              isInvalid={Boolean(errors.description)}
            />
            <Form.Control.Feedback type="invalid">
              {translate("login.form.description.feedback.maxLength")}
            </Form.Control.Feedback>
          </Col>
        </Form.Group>

        <Form.Group as={Row} className="mb-3" controlId="loginRememberMe">
          <Col sm={{span: 5, offset: 4}}>
            <Form.Check
              {...register("rememberMe")}
              label={translate("login.form.rememberMe.label")}
            />
          </Col>
          <Col sm={{span: 2}}>
            <Button
              variant="link"
              size="sm"
              onClick={() => {LocalLogger.info("open AK history")}}
            >
              {translate("login.accessKeyHistory")}
            </Button>
          </Col>
        </Form.Group>
      </fieldset>

      <Form.Group as={Row} className="mb-3">
        <Col sm={{span: 7, offset: 4}}>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            <Spinner className={classNames("me-2", {"visually-hidden": !isSubmitting})} animation="border" size="sm"/>
            {translate("login.form.submit")}
          </Button>
        </Col>
      </Form.Group>
    </Form>
  );
};

export default LoginForm;
