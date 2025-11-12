import React, { useMemo, useCallback, useState } from 'react';
import { 
  DndContext, 
  closestCorners, 
  PointerSensor, 
  TouchSensor, // 1. Import TouchSensor
  useSensor, 
  useSensors, 
  DragOverlay 
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Sparkles, Briefcase } from 'lucide-react';
import { useStore } from '../../lib/store';

// We are NOT using the shared ui/JobCard here.
// We are defining the card locally, just like your "old code".

const columnTitles = { 'Applied': 'Applied', 'Interviewing': 'Interviewing', 'Offer': 'Offer', 'Rejected': 'Rejected' };
const columnColors = { 'Applied': 'bg-sky-500', 'Interviewing': 'bg-purple-500', 'Offer': 'bg-emerald-500', 'Rejected': 'bg-red-500' };

const getLogoUrl = (companyName) => {
    if (!companyName) {
        return `https://avatar.vercel.sh/${companyName}.png?text=?`;
    }
    return `https://logo.clearbit.com/${companyName.toLowerCase().replace(/ /g, '')}.com`;
};

// --- THIS IS THE FIX ---
// This is your "old code" JobCard, but refactored to support mobile drag-and-drop.
function SortableJobCard({ job, columnId }) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ 
    id: job.id,
    data: { type: 'Job', job }
  });
  
  const setSelectedJob = useStore(state => state.setSelectedJob);
  const openInterviewPrepModal = useStore(state => state.openInterviewPrepModal);

  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    opacity: isDragging ? 0.5 : 1, 
    zIndex: isDragging ? 100 : "auto",
  };

  const handlePrepClick = (e) => {
    e.stopPropagation(); // Stop click from propagating to the card
    setSelectedJob(job);
    openInterviewPrepModal();
  };

  return (
    // The outer div handles sorting and positioning
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* This inner div is the drag handle. It gets the listeners and touch styles.
        The onClick to open the panel is on THIS div.
      */}
      <div 
        {...listeners} 
        onClick={() => setSelectedJob(job)}
        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-500 cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex items-start gap-3">
          <img
            src={getLogoUrl(job.company)}
            alt={`${job.company} logo`}
            onError={(e) => { e.target.src = `https://avatar.vercel.sh/${job.company}.png?text=${job.company.charAt(0)}`; }}
            className="w-10 h-10 rounded-md border border-slate-100 object-contain"
          />
          <div>
            <h4 className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2">{job.title}</h4>
            <p className="text-xs text-slate-500 mt-1">{job.company}</p>
          </div>
        </div>
      </div> 
      
      {/* The "Prep" button is separate, so its onClick is safe */}
      {columnId === 'Interviewing' && (
        <button 
          onClick={handlePrepClick} 
          className="-mt-2 relative z-10 w-[calc(100%-1rem)] mx-auto flex items-center justify-center gap-2 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-b-md py-1.5 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          Prep for Interview
        </button>
      )}
    </div>
  );
}
// --- END OF FIX ---


function Column({ columnId, title, jobs }) {
    const { setNodeRef } = useSortable({ id: columnId, data: { type: 'Column' } });

    return (
        <div className="bg-slate-100 rounded-lg w-full md:w-72 flex-shrink-0 flex flex-col">
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${columnColors[columnId]}`}></div>
                    <h3 className="font-bold text-slate-700">{title}</h3>
                </div>
                <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{jobs.length}</span>
            </div>
            <SortableContext id={columnId} items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
                {/* This div holds the cards. Added space-y-3 for consistent spacing,
                  which replaces the mb-3 on the old card.
                */}
                <div ref={setNodeRef} className="p-3 pt-0 flex-grow min-h-[200px] overflow-y-auto space-y-3">
                    {jobs.map(job => (
                        <SortableJobCard 
                          key={job.id} 
                          job={job} 
                          columnId={columnId}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}

// --- Main Component ---
export default function KanbanTracker({ jobs, updateJobStatus }) {
    const [activeJob, setActiveJob] = useState(null);

    const columns = useMemo(() => {
        const newColumns = { 'Applied': [], 'Interviewing': [], 'Offer': [], 'Rejected': [] };
        const trackedJobs = jobs ? jobs.filter(job => job.is_tracked) : [];
        
        trackedJobs.forEach(job => {
            const status = job.status || 'Applied'; 
            if (newColumns[status]) {
                newColumns[status].push(job);
            }
        });
        return newColumns;
    }, [jobs]);

    // --- SENSOR FIX: Using your suggested settings ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    const findColumnForJob = useCallback((jobId) => {
        if (!jobId) return null;
        return Object.keys(columns).find(columnId => 
            columns[columnId].some(job => job.id === jobId)
        );
    }, [columns]);

    const handleDragStart = (event) => {
        const { active } = event;
        if (active.data.current?.type === 'Job') {
            setActiveJob(active.data.current.job);
        }
    };

    const handleDragEnd = useCallback((event) => {
        setActiveJob(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const activeColumn = findColumnForJob(activeId);
        
        const overIsColumn = over.data.current?.type === 'Column';
        const overColumn = overIsColumn ? over.id : findColumnForJob(overId);

        if (!activeColumn || !overColumn || activeColumn === overColumn) {
            return; 
        }
        
        updateJobStatus(activeId, overColumn);

    }, [findColumnForJob, updateJobStatus]);

    // This is the "Drag Overlay" card that appears while dragging
    const renderDragOverlay = () => {
      if (!activeJob) return null;

      // We re-create the card's visual style here for the overlay
      return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-lg cursor-grabbing">
          <div className="flex items-start gap-3">
            <img
              src={getLogoUrl(activeJob.company)}
              alt={`${activeJob.company} logo`}
              onError={(e) => { e.target.src = `https://avatar.vercel.sh/${activeJob.company}.png?text=${activeJob.company.charAt(0)}`; }}
              className="w-10 h-10 rounded-md border border-slate-100 object-contain"
            />
            <div>
              <h4 className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2">{activeJob.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{activeJob.company}</p>
            </div>
          </div>
          {findColumnForJob(activeJob.id) === 'Interviewing' && (
            <div className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold text-purple-700 bg-purple-100 rounded-md py-1.5">
              <Sparkles className="w-3 h-3" />
              Prep for Interview
            </div>
          )}
        </div>
      );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <Briefcase className="w-7 h-7" />
                    <h2 className="text-2xl font-bold">Application Tracker</h2>
                </div>
            </div>

            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners} 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto md:pb-4">
                    <SortableContext items={Object.keys(columns)}>
                        {Object.entries(columns).map(([columnId, columnJobs]) => (
                            <Column
                                key={columnId}
                                columnId={columnId}
                                title={columnTitles[columnId]}
                                jobs={columnJobs}
                            />
                        ))}
                    </SortableContext>
                </div>

                <DragOverlay>
                    {renderDragOverlay()}
                </DragOverlay>
            </DndContext>
        </div>
    );
}