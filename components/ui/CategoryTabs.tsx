"use client";

type TabType = "face" | "match" | "saju";

interface CategoryTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function CategoryTabs({
  activeTab,
  onTabChange,
}: CategoryTabsProps) {
  return (
    <div className="flex justify-center gap-3 mb-5">
      <button
        className={`px-5 py-2 rounded-full text-base cursor-pointer transition-all ${
          activeTab === "face"
            ? "bg-[#222] text-white border border-[#222]"
            : "bg-white text-gray-500 border border-[#bababa]"
        }`}
        onClick={() => onTabChange("face")}
      >
        정통 관상
      </button>

      <button
        className={`px-5 py-2 rounded-full text-base cursor-pointer transition-all ${
          activeTab === "match"
            ? "bg-[#222] text-white border border-[#222]"
            : "bg-white text-gray-500 border border-[#bababa]"
        }`}
        onClick={() => onTabChange("match")}
      >
        궁합 관상
      </button>

      <button
        className={`relative px-5 py-2 rounded-full text-base cursor-pointer transition-all overflow-visible ${
          activeTab === "saju"
            ? "bg-[#222] text-white border border-[#222]"
            : "bg-white text-gray-500 border border-[#bababa]"
        }`}
        onClick={() => onTabChange("saju")}
      >
        연애 사주
        <span className="absolute -top-3 -right-3.5 bg-gradient-to-br from-[#ff6b6b] to-[#ee5a24] text-white text-[10px] font-bold px-1.5 py-1 rounded whitespace-nowrap shadow-[0_2px_6px_rgba(238,90,36,0.4)] z-10">
          오늘만 100원
        </span>
      </button>
    </div>
  );
}
