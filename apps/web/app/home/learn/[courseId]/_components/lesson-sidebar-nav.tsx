'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CheckCircle2, FileText, PlayCircle, HelpCircle } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  order_index: number;
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface LessonSidebarNavProps {
  courseId: string;
  modules: Module[];
  completedLessonsSet: string[]; // array of lesson IDs
}

export function LessonSidebarNav({ courseId, modules, completedLessonsSet }: LessonSidebarNavProps) {
  const pathname = usePathname();
  const completedSet = new Set(completedLessonsSet);

  // Extract current lessonId from the URL
  const match = pathname.match(/\/lesson\/([^/]+)/);
  const activeLessonId = match?.[1] ?? null;

  return (
    <div className="flex-1 space-y-6 p-4">
      {modules.map((mod, i) => (
        <div key={mod.id}>
          <h3 className="text-foreground mb-3 flex items-start gap-2 text-sm font-bold">
            <span className="bg-primary/15 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold">
              {i + 1}
            </span>
            <span>{mod.title}</span>
          </h3>
          <ul className="space-y-0.5 pl-1">
            {mod.lessons?.map((lesson) => {
              const isCompleted = completedSet.has(lesson.id);
              const isActive = lesson.id === activeLessonId;

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/home/learn/${courseId}/lesson/${lesson.id}`}
                    className={`group flex items-start gap-2.5 rounded-md px-2 py-2 text-sm transition-all ${
                      isActive
                        ? 'bg-slate-700 text-white font-semibold shadow-sm'
                        : isCompleted
                          ? 'text-foreground/60 hover:bg-slate-100 hover:text-foreground'
                          : 'text-foreground/80 hover:bg-slate-100 hover:text-foreground'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className={`h-4 w-4 ${isActive ? 'text-white' : 'text-green-500'}`} />
                      ) : (
                        <FileText className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <span className={`leading-tight ${isCompleted && !isActive ? 'line-through opacity-60' : ''}`}>
                      {lesson.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
