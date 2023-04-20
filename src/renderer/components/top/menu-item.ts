import {ReactNode} from "react";

export enum MenuItemType {
  Link = "link",
  Dropdown = "dropdown",
  // Costume = "costume",
}

interface LinkItem {
  id: string,
  type: MenuItemType.Link,
  className?: string,
  iconClassName?: string,
  text: string | ReactNode,
  active?: boolean,
  onClick?: (item: MenuItem) => void,
}

interface DropdownItem {
  id: string,
  type: MenuItemType.Dropdown,
  className?: string,
  text: string | ReactNode,
  items: LinkItem[],
}

export type MenuItem = LinkItem | DropdownItem;
