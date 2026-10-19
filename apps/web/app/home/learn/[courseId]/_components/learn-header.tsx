'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Target, TrendingUp, Trophy, X } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@kit/ui/sheet';

import { LessonSidebarNav } from './lesson-sidebar-nav';

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: { id: string; title: string; order_index: number }[];
}

interface LearnHeaderProps {
  courseId: string;
  courseTitle: string;
  modules: Module[];
  completedLessonsSet: string[];
  progressPercentage: number;
}

export function LearnHeader({
  courseId,
  courseTitle,
  modules,
  completedLessonsSet,
  progressPercentage,
}: LearnHeaderProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Total lessons count
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedCount = completedLessonsSet.length;

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-3 sm:px-6 shadow-xs">
      {/* Left side: Mobile syllabus trigger & Back button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Temario Drawer (Sheet) */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden gap-1.5 h-9 px-2.5 text-xs font-semibold border-primary/30 text-foreground bg-primary/5 hover:bg-primary/10"
              aria-label="Abrir temario del curso"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Temario</span>
              <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 py-0.2 text-[10px] font-bold">
                {completedCount}/{totalLessons}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[88vw] sm:max-w-sm p-0 flex flex-col h-full bg-background"
          >
            <SheetHeader className="p-4 border-b text-left bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Link
                  href="/home/courses"
                  onClick={() => setMobileSheetOpen(false)}
                  className="text-muted-foreground hover:text-primary text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver al catálogo
                </Link>
                <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cerrar</span>
                </SheetClose>
              </div>

              <SheetTitle className="text-base font-bold text-foreground leading-snug line-clamp-2">
                {courseTitle}
              </SheetTitle>

              {/* Progress bar inside mobile drawer */}
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso de la materia</span>
                  <span className="font-bold text-foreground">{progressPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              <LessonSidebarNav
                courseId={courseId}
                modules={modules}
                completedLessonsSet={completedLessonsSet}
                onSelectLesson={() => setMobileSheetOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop breadcrumb / Course info */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/home/courses"
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Catálogo
          </Link>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="text-xs font-medium text-foreground truncate max-w-xs lg:max-w-md">
            {courseTitle}
          </span>
        </div>

        {/* Quick mobile link to catalog */}
        <Link
          href="/home/courses"
          className="md:hidden text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded bg-muted/40 hover:bg-muted"
          title="Volver al catálogo"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">Catálogo</span>
        </Link>
      </div>

      {/* Right side: Progress Indicator (Fully responsive) */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex flex-col items-end">
          <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Tu progreso
          </span>
          <span className="text-xs sm:text-sm font-bold text-foreground">
            {progressPercentage}% <span className="hidden sm:inline font-normal text-muted-foreground">completado</span>
          </span>
        </div>

        {/* Progress Circular */}
        <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              className="text-muted"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
            <circle
              className="text-primary transition-all duration-1000 ease-in-out"
              strokeWidth="8"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * progressPercentage) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
          </svg>
          <div className="absolute flex items-center justify-center text-primary">
            {progressPercentage === 0 ? (
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : progressPercentage === 100 ? (
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
