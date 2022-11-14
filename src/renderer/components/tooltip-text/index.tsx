import React from "react";
import {OverlayTrigger, Tooltip} from "react-bootstrap";
import {Placement} from "react-bootstrap/types";

interface TooltipTextProps {
  delay?: number
    | {
      show: number,
      hide: number,
    },
  tooltipPlacement?: Placement,
  tooltipContent: React.ReactNode | string,
  disabled?: boolean
  children: React.ReactElement,
}

const TooltipText: React.FC<TooltipTextProps> = ({
  delay,
  tooltipPlacement,
  tooltipContent,
  disabled = false,
  children,
}) => {

  // fix always show tip when disabled false->true
  const showTip = disabled ? false : undefined;

  return (
    <OverlayTrigger
      delay={delay}
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
