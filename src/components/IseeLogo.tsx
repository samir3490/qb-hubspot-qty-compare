/** iSee Store Innovations — vector logo for light backgrounds */
export function IseeLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 72"
      role="img"
      aria-label="iSee Store Innovations"
    >
      <text
        x="0"
        y="46"
        fontFamily="'Segoe UI', 'Arial Black', 'Helvetica Neue', sans-serif"
        fontSize="46"
        fontWeight="900"
        fontStyle="italic"
        fill="#231f20"
      >
        iSEE
      </text>
      <text
        x="188"
        y="28"
        fontFamily="'Segoe UI', sans-serif"
        fontSize="11"
        fill="#231f20"
      >
        ®
      </text>
      <text
        x="0"
        y="68"
        fontFamily="'Segoe UI', sans-serif"
        fontSize="12.5"
        fontWeight="600"
        letterSpacing="0.32em"
        fill="#00aeef"
      >
        STORE INNOVATIONS
      </text>
    </svg>
  );
}
