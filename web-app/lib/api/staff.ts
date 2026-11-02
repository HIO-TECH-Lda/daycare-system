'use client';

/**
 * Data for the staff screens. Every query here is kept on the device (`meta.offline`), so the
 * screens open without internet with the last data seen, and every view of today's records
 * includes the writes still waiting in the offline queue.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { refId, type Activity, type Attendance, type AttendanceStatus, type Child, type ClassInfo, type DailyReport, type PickupPerson, type ReportPhoto, type StaffAssignment } from './types';
import { usePendingWrites } from '@/lib/offline/writes';
import type { DailyReportFields } from '@/lib/offline/writes';

const OFFLINE = { offline: true };
// Lists are small (a centre's classes and children): one page covers them
const ALL = { limit: 100 };

async function list<T>(path: string, params: Record<string, string | number> = {}): Promise<T[]> {
  return (await api.get<T[]>(path, { ...ALL, ...params })).data;
}

/** The classes the signed-in educator is assigned to, by name. */
export function useMyClasses() {
  return useQuery({
    queryKey: ['staff-assignments', 'mine'],
    queryFn: () => list<StaffAssignment>('/staff-assignments'),
    meta: OFFLINE,
    select: (rows) => {
      const classes = new Map<string, ClassInfo>();
      for (const row of rows) if (row.class_id && typeof row.class_id === 'object') classes.set(row.class_id._id, row.class_id);
      return [...classes.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    }
  });
}

/** The children in the educator's classes (the API only returns those), by name. */
export function useMyChildren() {
  return useQuery({
    queryKey: ['children', 'mine'],
    queryFn: () => list<Child>('/children'),
    meta: OFFLINE,
    select: (rows) => [...rows].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
  });
}

/** Authorised pickup people for the educator's children, by child id. */
export function usePickupPeople() {
  return useQuery({
    queryKey: ['pickup-persons', 'mine'],
    queryFn: () => list<PickupPerson>('/pickup-persons'),
    meta: OFFLINE,
    select: (rows) => {
      const byChild = new Map<string, PickupPerson[]>();
      for (const row of rows) {
        const childId = refId(row.child_id);
        if (!childId || !row.is_authorized) continue;
        byChild.set(childId, [...(byChild.get(childId) ?? []), row]);
      }
      return byChild;
    }
  });
}

/** Activities set up by the administration (suggestions in the daily report). */
export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => list<Activity>('/activities'),
    meta: OFFLINE,
    staleTime: 60 * 60 * 1000
  });
}

// --- Today's records, with the writes still waiting on this device ---

export interface DayAttendance {
  status?: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  /** Changes made on this device that the API doesn't have yet */
  pending: boolean;
}

/** Attendance for one centre day (YYYY-MM-DD), by child id. */
export function useDayAttendance(day: string) {
  const query = useQuery({
    queryKey: ['attendance', day],
    queryFn: () => list<Attendance>('/attendance', { date: day }),
    meta: OFFLINE
  });
  const pending = usePendingWrites('attendance', { day });

  const byChild = useMemo(() => {
    const map = new Map<string, DayAttendance>();
    for (const record of query.data ?? []) {
      const childId = refId(record.child_id);
      if (childId) map.set(childId, { status: record.status, checkIn: record.check_in, checkOut: record.check_out, notes: record.notes, pending: false });
    }
    // The queue holds writes oldest first; each one merges into the record, as the API will do
    for (const write of pending) {
      const body = write.body as { status?: AttendanceStatus; check_in?: string; check_out?: string; notes?: string };
      const current = map.get(write.childId) ?? { pending: true };
      map.set(write.childId, {
        status: body.status ?? current.status,
        checkIn: body.check_in ?? current.checkIn,
        checkOut: body.check_out ?? current.checkOut,
        notes: body.notes ?? current.notes,
        pending: true
      });
    }
    return map;
  }, [query.data, pending]);

  return { ...query, byChild };
}

export interface DayReport {
  /** The API's record (photos need it), if it has one yet */
  id?: string;
  fields: DailyReportFields;
  pending: boolean;
}

function reportFields(report: DailyReport): DailyReportFields {
  return {
    meals: report.meals,
    nap_time: report.nap_time,
    activities: report.activities,
    mood: report.mood,
    notes: report.notes,
    behavior_notes: report.behavior_notes,
    health_notes: report.health_notes
  };
}

/** Daily reports for one centre day (YYYY-MM-DD), by child id. */
export function useDayReports(day: string) {
  const query = useQuery({
    queryKey: ['daily-report', day],
    // Reports are filed under midnight UTC of their day: a one-day range finds them
    queryFn: () => list<DailyReport>('/daily-reports', { start_date: day, end_date: day }),
    meta: OFFLINE
  });
  const pending = usePendingWrites('daily-report', { day });

  const byChild = useMemo(() => {
    const map = new Map<string, DayReport>();
    for (const report of query.data ?? []) {
      const childId = refId(report.child_id);
      if (childId) map.set(childId, { id: report._id, fields: reportFields(report), pending: false });
    }
    for (const write of pending) {
      const current = map.get(write.childId);
      map.set(write.childId, { id: current?.id, fields: { ...current?.fields, ...(write.body as DailyReportFields) }, pending: true });
    }
    return map;
  }, [query.data, pending]);

  return { ...query, byChild };
}

/** Photos of one daily report (needs the internet: photos aren't kept on the device). */
export function useReportPhotos(reportId: string | undefined) {
  return useQuery({
    queryKey: ['report-photos', reportId],
    queryFn: async () => (await api.get<ReportPhoto[]>(`/report-photos/report/${reportId}`)).data,
    enabled: !!reportId
  });
}

/** Children of one class, from the educator's children. */
export function childrenOfClass(children: Child[] | undefined, classId: string | null): Child[] {
  if (!children) return [];
  return classId ? children.filter((child) => refId(child.class_id) === classId) : children;
}
