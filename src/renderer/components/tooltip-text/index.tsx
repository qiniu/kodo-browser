import React from "react";
import {OverlayTrigger, Tooltip} from "react-bootstrap";
import {Placement} from "react-bootstrap/types";

interface TooltipTextProps {
  tooltipPlacement?: Placement,
  tooltipContent: React.ReactElement | string,
  disabled?: boolean
  children: React.ReactElement,
}

const TooltipText: React.FC<TooltipTextProps> = (props) => {
  const {
    tooltipPlacement,
    tooltipContent,
    disabled = false,
    children,
  } = props;

  // fix always show tip when disabled false->true
  const showTip = disabled ? false : undefined;

  return (
    <OverlayTrigger
      show={showTip}
      placement={tooltipPlacement ?? "auto"}
      overlay={
        <Tooltip>
          {tooltipContent}
        </Tooltip>
      }
    >
      {children}
    </OverlayTrigger>
  )
}

export default TooltipText;
