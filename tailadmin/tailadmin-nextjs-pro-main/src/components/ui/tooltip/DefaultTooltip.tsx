import Tooltip from "./Tooltip";

export default function DefaultTooltip() {
  return (
    <div>
      <Tooltip content="This is a tooltip" placement="top">
        <button className="inline-flex px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 shadow-theme-xs">
          Tooltip Top
        </button>
      </Tooltip>
    </div>
  );
}
