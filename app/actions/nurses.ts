'use server';

/**
 * Server Actions for Nurses & Staff Operations
 * Salita Feliz - Enterprise Healthcare System
 */

import { getGeneralNurseStats, getNursesOnDutyToday, getNurses } from '@/lib/database';

export async function getGeneralNurseStatsAction() {
  return await getGeneralNurseStats();
}

export async function getNursesOnDutyTodayAction() {
  return await getNursesOnDutyToday();
}

export async function getNursesAction() {
  return await getNurses();
}
