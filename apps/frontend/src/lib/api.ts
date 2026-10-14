import axios from 'axios';

export type User = {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
  firstName?: string;
  lastName?: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  members: number;
  status: string;
  settings?: {
    invoiceTemplate?: string;
    fileSizeLimitMb?: number;
    maxFilesPerJob?: number;
  };
};

export type Job = {
  id: string;
  workspaceId: string;
  templateId: string;
  status: string;
  fileCount: number;
  progress?: number;
  source?: string;
  createdAt?: string;
  invoiceNumber?: string | null;
  vendorName?: string | null;
  totalAmount?: string | null;
  reviewStatus?: string;
  exportPath?: string | null;
  reviewSummary?: string | null;
};

export const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 15000,
});

export async function getMe() {
  const response = await api.get<{ user: User }>('/auth/me');
  return response.data.user;
}

export async function login(payload: { email: string; password: string }) {
  const response = await api.post<{ user: User }>('/auth/login', payload);
  return response.data.user;
}

export async function register(payload: { firstName: string; lastName: string; email: string; password: string }) {
  const response = await api.post<{ user: User }>('/auth/register', payload);
  return response.data.user;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function getWorkspaces() {
  const response = await api.get<{ workspaces: Workspace[] }>('/workspaces');
  return response.data.workspaces;
}

export async function getJobs() {
  const response = await api.get<{ jobs: Job[] }>('/jobs');
  return response.data.jobs;
}

export async function getJob(jobId: string) {
  const response = await api.get<{ job: Job }>('/jobs/' + jobId);
  return response.data.job;
}

export async function createJob(payload: { workspaceId: string; templateId: string; fileCount: number; source: 'upload' | 'api' }) {
  const response = await api.post<{ job: Job }>('/jobs', payload);
  return response.data.job;
}

export async function presignUpload(payload: { filename: string; contentType: string; size: number }) {
  const response = await api.post('/uploads/presign', payload);
  return response.data;
}
