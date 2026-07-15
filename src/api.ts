import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { FileItem, Folder, Message, Mention, Person } from './types';

const URL_KEY = 'rag.api.url';
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL || (expoHost ? `http://${expoHost}:8080` : 'http://localhost:8080');

export async function getApiUrl() {
  const stored = await AsyncStorage.getItem(URL_KEY);
  if (!stored || (expoHost && /localhost|127\.0\.0\.1/.test(stored))) return DEFAULT_URL;
  return stored;
}
export async function setApiUrl(value: string) { await AsyncStorage.setItem(URL_KEY, value.replace(/\/$/, '')); }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${await getApiUrl()}${path}`, init);
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const getFolders = () => request<Folder[]>('/api/folders');
export const createFolder = (name: string) => request<Folder>('/api/folders/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
export const deleteFolder = (id: string) => request<void>(`/api/folders/${id}`, {method:'DELETE'});
export async function getFiles(folderId: string) {
  const files = await request<{path:string;name:string;fileType:string;extractedText?:string}[]>(`/api/folders/${encodeURIComponent(folderId)}/files`);
  const base = await getApiUrl();
  return files.map(file => ({id:file.path,path:file.path,name:file.name,type:file.fileType || 'application/octet-stream',url:file.fileType?.toLowerCase().startsWith('image/') ? `${base}/api/data/files/content?path=${encodeURIComponent(file.path)}` : undefined,extractedText:file.extractedText})) as FileItem[];
}
export const fileUrl = async (path: string) => `${await getApiUrl()}/api/data/files/content?path=${encodeURIComponent(path)}`;
export const getPreview = (path: string) => request<{kind:string; title:string; mimeType:string; content:string; path:string}>(`/api/data/files/preview?path=${encodeURIComponent(path)}`);
export const renameFile = (oldPath: string, newName: string) => request<void>('/api/data/files/rename', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({oldPath,newName})});
export const getFileEmbeddings = (path: string) => request<{title:string;content:string;chunkCount:string}>(`/api/data/files/embeddings?path=${encodeURIComponent(path)}`);
export const moveFiles = (filePaths: string[], targetFolderId: string) => request<void>('/api/data/files/move', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({filePaths,targetFolderId})});
export const deleteFiles = (filePaths: string[]) => request<void>('/api/data/files/delete', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({filePaths})});

export async function uploadFile(folderId: string, asset: {uri:string; name:string; mimeType?:string}) {
  const body = new FormData();
  body.append('file', {uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream'} as unknown as Blob);
  return request<{path:string; fileName:string; image:boolean}>(`/api/folders/${folderId}/upload`, {method:'POST', body});
}

export const getPeople = () => request<Person[]>('/api/knowledge/entities');
export const getMentions = (path: string) => request<Mention[]>(`/api/knowledge/mentions/by-file?path=${encodeURIComponent(path)}`);
export const detectFaces = (path: string) => request<Mention[]>(`/api/knowledge/mentions/by-file/detect-faces?path=${encodeURIComponent(path)}`, {method:'POST'});
export const renamePerson = (id: string, newName: string) => request<void>(`/api/knowledge/entities/${id}/rename?newName=${encodeURIComponent(newName)}`, {method:'PUT'});
export const renameMention = (id: string, newName: string) => request<void>(`/api/knowledge/mentions/${id}/rename?newName=${encodeURIComponent(newName)}`, {method:'PUT'});
export const confirmMention = (mentionId: string, entityId: string) => request<void>(`/api/knowledge/mentions/${mentionId}/confirm?entityId=${encodeURIComponent(entityId)}`, {method:'POST'});
export const rejectMention = (mentionId: string) => request<void>(`/api/knowledge/mentions/${mentionId}/reject`, {method:'POST'});
export const resolveFaceBatch = (paths: string[]) => request<{linked:number;clusters:number;unresolved:number}>('/api/knowledge/faces/resolve-batch', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({paths})});

export async function getChats() {
  try { const summaries = await request<{id:string;name?:string;updatedAt?:string}[]>('/api/chat/summaries'); return summaries.map(s => ({id:s.id,title:s.name || 'Nowa rozmowa',updatedAt:s.updatedAt})); }
  catch { const ids = await request<string[]>('/api/chat/all'); return ids.map(id => ({id, title:`Chat ${id.slice(0,8)}`, updatedAt:undefined})); }
}
export const createChat = () => request<{id:string}>('/api/chat/create', { method: 'POST' });
export const getMessages = (id:string) => request<{type:string;text:string;sources?:Message['sources']}[]>(`/api/chat/${id}/messages`).then(items => items.map((m,i)=>({id:`${id}-${i}`,role:(m.type==='USER'?'user':'assistant') as 'user'|'assistant',content:m.text,sources:m.sources})));
export const sendMessage = (id:string, message:string) => request<{response:string; sources?:Message['sources']; uncertain?:boolean}>(`/api/chat/${id}/send`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});
export const renameChat = (id:string, newName:string) => request<void>(`/api/chat/${id}/rename`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({newName})});
