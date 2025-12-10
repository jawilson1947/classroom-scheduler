import { useState } from 'react';

export type TimeFilter = 'current' | 'all';
export type EventType = 'Event' | 'Meeting' | 'Class' | 'Other';
export type TypeFilter = 'All' | EventType;
export type SortBy = 'name' | 'date';
export type SortOrder = 'asc' | 'desc';

interface FilterSortCardProps {
    timeFilter: TimeFilter;
    onTimeFilterChange: (value: TimeFilter) => void;
    typeFilter: TypeFilter;
    onTypeFilterChange: (value: TypeFilter) => void;
    sortBy: SortBy;
    onSortByChange: (value: SortBy) => void;
    sortOrder: SortOrder;
    onSortOrderChange: (value: SortOrder) => void;
}

export function FilterSortCard({
    timeFilter,
    onTimeFilterChange,
    typeFilter,
    onTypeFilterChange,
    sortBy,
    onSortByChange,
    sortOrder,
    onSortOrderChange,
}: FilterSortCardProps) {
    const [localTimeFilter, setLocalTimeFilter] = useState(timeFilter);
    const [localTypeFilter, setLocalTypeFilter] = useState(typeFilter);
    const [localSortBy, setLocalSortBy] = useState(sortBy);
    const [localSortOrder, setLocalSortOrder] = useState(sortOrder);

    const handleApply = () => {
        onTimeFilterChange(localTimeFilter);
        onTypeFilterChange(localTypeFilter);
        onSortByChange(localSortBy);
        onSortOrderChange(localSortOrder);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-row flex-wrap md:flex-nowrap justify-center items-center gap-4 overflow-x-auto">
                {/* Filter Group */}
                <div className="flex flex-row items-center gap-3 px-4 py-2 border border-gray-300 rounded-md text-xs whitespace-nowrap">
                    {/* Time Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-semibold">Time:</span>
                        <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded transition-colors">
                            <input
                                type="radio"
                                name="timeFilter"
                                value="current"
                                checked={localTimeFilter === 'current'}
                                onChange={(e) => setLocalTimeFilter(e.target.value as TimeFilter)}
                                className="w-3.5 h-3.5 text-blue-600 cursor-pointer"
                            />
                            <span>Current</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded transition-colors">
                            <input
                                type="radio"
                                name="timeFilter"
                                value="all"
                                checked={localTimeFilter === 'all'}
                                onChange={(e) => setLocalTimeFilter(e.target.value as TimeFilter)}
                                className="w-3.5 h-3.5 text-blue-600 cursor-pointer"
                            />
                            <span>All</span>
                        </label>
                    </div>

                    <div className="h-4 w-px bg-gray-300 mx-1"></div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="typeFilter" className="text-gray-600 font-semibold">
                            Filter:
                        </label>
                        <select
                            id="typeFilter"
                            value={localTypeFilter}
                            onChange={(e) => setLocalTypeFilter(e.target.value as TypeFilter)}
                            className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs bg-white min-w-[100px]"
                        >
                            <option value="All">All Types</option>
                            <option value="Event">Event</option>
                            <option value="Meeting">Meeting</option>
                            <option value="Class">Class</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                {/* Sort Group */}
                <div className="flex flex-row items-center gap-3 px-4 py-2 border border-gray-300 rounded-md text-xs whitespace-nowrap">
                    {/* Sort By */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="sortBy" className="text-gray-600 font-semibold">
                            Sort by:
                        </label>
                        <select
                            id="sortBy"
                            value={localSortBy}
                            onChange={(e) => setLocalSortBy(e.target.value as SortBy)}
                            className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs bg-white min-w-[100px]"
                        >
                            <option value="name">Event Name</option>
                            <option value="date">Event Date</option>
                        </select>
                    </div>

                    <div className="h-4 w-px bg-gray-300 mx-1"></div>

                    {/* Sort Order */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-semibold">Order:</span>
                        <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded transition-colors">
                            <input
                                type="radio"
                                name="sortOrder"
                                value="asc"
                                checked={localSortOrder === 'asc'}
                                onChange={(e) => setLocalSortOrder(e.target.value as SortOrder)}
                                className="w-3.5 h-3.5 text-blue-600 cursor-pointer"
                            />
                            <span>▲</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded transition-colors">
                            <input
                                type="radio"
                                name="sortOrder"
                                value="desc"
                                checked={localSortOrder === 'desc'}
                                onChange={(e) => setLocalSortOrder(e.target.value as SortOrder)}
                                className="w-3.5 h-3.5 text-blue-600 cursor-pointer"
                            />
                            <span>▼</span>
                        </label>
                    </div>
                </div>

                {/* Go Button */}
                <button
                    onClick={handleApply}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-bold uppercase tracking-wider shadow-sm"
                >
                    Go
                </button>
            </div>
        </div>
    );
}
