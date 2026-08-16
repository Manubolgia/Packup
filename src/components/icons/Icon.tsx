import type { SVGProps } from 'react';
import type { ContainerKind } from '@/domain/types';

/**
 * One icon language for the whole app: 24-unit grid, 1.5 stroke, square caps
 * and joins, no fill, no curves except where a real object has one. Drawn like
 * a parts diagram — the flat counterpart to the 3D scene in M4.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  size?: number;
  title?: string;
};

function Svg({ size = 24, title, children, ...svg }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      shapeRendering="geometricPrecision"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...svg}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconSuitcase(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6V4h6v2" />
      <rect x="3" y="6" width="18" height="13" />
      <path d="M8 6v13M16 6v13" />
      <path d="M6 19v1.5M18 19v1.5" />
    </Svg>
  );
}

export function IconBag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 8h14l1 12H4L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <path d="M4 13h16" />
    </Svg>
  );
}

export function IconPouch(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="7" width="18" height="11" />
      <path d="M3 11h18" />
      <path d="M10.5 7V5h3v2" />
      <path d="M11 13.5h2" />
    </Svg>
  );
}

export function IconPerson(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v4" />
      <path d="M8.5 8h7l1.5 6h-3l-.5 6h-4l-.5-6h-3L8.5 8Z" />
      <path d="M9.5 5.5h5" />
    </Svg>
  );
}

const KIND_ICON: Record<ContainerKind, (p: IconProps) => React.JSX.Element> = {
  suitcase: IconSuitcase,
  bag: IconBag,
  pouch: IconPouch,
  person: IconPerson,
};

/** Container-kind marker used in lists, tabs and the drawer. */
export function IconForKind({ kind, ...props }: IconProps & { kind: ContainerKind }) {
  const Cmp = KIND_ICON[kind];
  return <Cmp {...props} />;
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 5L8 12l6.5 7" />
    </Svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" strokeLinecap="round" strokeWidth={2.25} />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12.5l5 5L20 6.5" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="M14 6l4 4" />
    </Svg>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8" y="8" width="12" height="12" />
      <path d="M16 8V4H4v12h4" />
    </Svg>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="4" />
      <path d="M5 8v12h14V8" />
      <path d="M10 12h4" />
    </Svg>
  );
}

export function IconExport(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 15v5h16v-5" />
    </Svg>
  );
}

export function IconImport(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v11" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 15v5h16v-5" />
    </Svg>
  );
}
