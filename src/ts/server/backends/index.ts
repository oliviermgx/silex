/*
 * Silex website builder, free/libre no-code tool for makers.
 * Copyright (c) 2023 lexoyo and Silex Labs foundation
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Application, Response, Router } from 'express'
import { Readable } from 'stream'
import { ServerConfig } from '../config'
import { JobStatus, JobData, BackendData, BackendId, WebsiteId, ApiBackendListResponse, ApiBackendListRequestQuery, ApiResponseError, ApiBackendLoginRequestQuery, ApiBackendLoggedInPostMessage, ApiBackendLogoutRequestQuery, BackendType, BackendUser, WebsiteMeta, ApiBackendLoginStatusRequestQuery, ApiBackendLoginStatusResponse, FileMeta } from '../../types'
import { API_BACKEND_LIST, API_BACKEND_LOGIN_CALLBACK, API_BACKEND_LOGIN_STATUS, API_BACKEND_LOGOUT } from '../../constants'
import { requiredParam } from '../utils/validation'

/**
 * @fileoverview define types for Silex backends
 * Bakends can provide storage for website data and assets, and/or hosting to publish the website online
 */

/**
 * Files are stored in backend as a File object
 * @see types/ClientSideFile
 */
export interface File {
  path: string,
  content: Buffer | string | Readable,
}

/**
 * Callback to update the publication status
 */
export type StatusCallback = ({message, status}: {message: string, status: JobStatus}) => Promise<void>

export type BackendSession = any
/**
 * Backends are the base interface for Storage and Hosting providers
 */
export interface Backend<Session extends BackendSession = BackendSession> {
  id: BackendId
  displayName: string
  icon: string
  disableLogout?: boolean
  type: BackendType
  getAdminUrl(session: Session, id: WebsiteId): Promise<string | null>
  getAuthorizeURL(session: Session): Promise<string | null>
  isLoggedIn(session: Session): Promise<boolean>
  //login(session: Session, userData: any): Promise<void>
  logout(session: Session): Promise<void>
  getUserData(session: Session): Promise<BackendUser>
  init(session: Session, id: WebsiteId): Promise<void>
}

/**
 * Storage are used to store the website data and assets
 * And possibly rename files and directories, and get the URL of a file
 *
 */
export interface StorageProvider<Session = BackendSession> extends Backend<Session> {
  listWebsites(session: Session): Promise<WebsiteMeta[]>
  readFile(session: Session, id: WebsiteId, path: string): Promise<File>
  writeFiles(session: Session, id: WebsiteId, files: File[], status?: StatusCallback): Promise<string[]> // Returns the files paths on storage
  deleteFiles(session: Session, id: WebsiteId, paths: string[]): Promise<void>
  listDir(session: Session, id: WebsiteId, path: string): Promise<FileMeta[]>
  createDir(session: Session, id: WebsiteId, path: string): Promise<void>
  deleteDir(session: Session, id: WebsiteId, path: string): Promise<void>
  getSiteMeta(session: Session, id: WebsiteId): Promise<WebsiteMeta>
  //getFileUrl(session: Session, id: WebsiteId, path: string): Promise<string>
}

/**
 * Hosting providers are used to publish the website
 */
export interface HostingProvider<Session = BackendSession> extends Backend<Session> {
  publish(session: Session, id: WebsiteId, backendData: BackendData, files: File[]): Promise<JobData>
  getWebsiteUrl(session: Session, id: WebsiteId): Promise<string>
}

export function toBackendEnum(type: string): BackendType {
  return BackendType[type.toUpperCase() as keyof typeof BackendType]
}

/**
 * Get a backend by id or by type
 */
export async function getBackend<T extends Backend>(config: ServerConfig, session: any, type: BackendType, backendId?: BackendId): Promise<T | undefined> {
  const backends = config.getBackends<T>(type)
  // Find the backend by id
  if (backendId) return backends.find(s => s.id === backendId && s.type === type)
  // Find the first logged in backend
  for (const backend of backends) {
    if (await backend.isLoggedIn(session)) {
      return backend
    }
  }
  // Defaults to the first backend
  return backends[0]
}

/**
 * Convert a backend to a BackendData object to be sent to the frontend
 */
export async function toBackendData(session: any, backend: Backend): Promise<BackendData> {
  return {
    backendId: backend.id,
    type: backend.type,
    displayName: backend.displayName,
    icon: backend.icon,
    disableLogout: !!backend.disableLogout,
    isLoggedIn: await backend.isLoggedIn(session),
    authUrl: await backend.getAuthorizeURL(session),
  }
}

/**
 * Add routes to the express app
 */
export function addRoutes(config: ServerConfig, app: Application) {
  // Create the router
  const router = Router()
  app.use(router)

  // Backend routes
  router.get(`/${API_BACKEND_LOGIN_STATUS}`, routeLoginStatus)
  router.get(`/${API_BACKEND_LIST}`, routeListBackends)
  router.post(`/${API_BACKEND_LOGOUT}`, routeLogout)
  router.get(`/${API_BACKEND_LOGIN_CALLBACK}`, routeLoginSuccess)
}

/**
 * Express route to check if the user is logged in
 * Returns user data and backend data
 */
export async function routeLoginStatus(req, res) {
  try {
    const config = requiredParam(req.app.get('config') as ServerConfig, 'Config object on express js APP')
    const query = requiredParam(req.query as ApiBackendLoginStatusRequestQuery, 'Query object')
    const session = requiredParam(req['session'], 'Session object')
    const websiteId = query.id
    const backendId = query.backendId
    const type = query.type
    const backend = await getBackend<Backend>(config, session, type, backendId)
    if (!backend) {
      res
        .status(500)
        .json({
          error: true,
          message: 'No backend found',
        } as ApiResponseError)
      return
    }
    if(!await backend.isLoggedIn(session)) {
      res
        .status(401)
        .json({
          error: true,
          message: 'Not logged in',
        } as ApiResponseError)
      return
    }
    const backendData = await toBackendData(session, backend)
    const user = await backend.getUserData(session)
    const websiteMeta = websiteId && backend.type === BackendType.STORAGE && await (backend as StorageProvider).getSiteMeta(session, websiteId)
    res.json({
      backend: backendData,
      user,
      websiteMeta,
    } as ApiBackendLoginStatusResponse)
  } catch (error) {
    console.error('Error in the login status request', error)
    res.status(error?.code ?? 500).json({
      error: true,
      message: error.message,
    } as ApiResponseError)
  }
}

/**
 * Express route to list the backends
 */
export async function routeListBackends(req, res) {
  try {
    const config = requiredParam(req.app.get('config') as ServerConfig, 'Config object on express js APP')
    const query = req.query as ApiBackendListRequestQuery
    const type = toBackendEnum(requiredParam(query.type, 'Backend type'))
    const backends = config.getBackends<Backend>(type)
    try {
      const list = await Promise.all(backends.map(async backend => toBackendData(req['session'], backend)))
      res.json(list as ApiBackendListResponse)
    } catch (error) {
      console.error('Error while listing backends', error)
      res.status(error?.code ?? 500).json({
        error: true,
        message: 'Error while listing backends: ' + error.message,
      } as ApiResponseError)
    }
  } catch (error) {
    console.error('Error in the list backends request', error)
    res.status(error?.code ?? 400).json({
      error: true,
      message: 'Error in the list backends request: ' + error.message,
    } as ApiResponseError)
  }
}

/**
 * Utility function to send an HTML page to the browser
 * This page will send a postMessage to the parent window and close itself
 */
function sendHtml(res: Response, message: string, backendId?: BackendId, error?: Error, defaultErrorCode?: number) {
  error && console.error('Error while logging in', error)
  // Data for postMessage
  const data = {
    type: 'login', // For postMessage
    error: error ? true : false,
    message,
    backendId,
  } as ApiBackendLoggedInPostMessage
  // HTTP status code
  const status = error ? error['code'] ?? defaultErrorCode ?? 500 : 200
  // Send the HTML
  res
    .status(status)
    .send(`
        <html>
          <head>
            <script>
              window.opener.postMessage(${JSON.stringify(data)}, '*')
              window.close()
            </script>
          </head>
          <body>
            <p>${message}</p>
            <p>Close this window</p>
          </body>
        </html>
      `)
}

/**
 * Express route to serve as redirect after a successful login
 * The returned HTML will postMessage data and close the popup window
 */
export async function routeLoginSuccess(req, res) {
  try {
    const query = req.query as ApiBackendLoginRequestQuery
    if(query.error) throw new Error(query.error)

    const backendId = requiredParam(query.backendId, 'Backend id')
    const config = requiredParam(req.app.get('config') as ServerConfig, 'Config object on express js APP')
    const type = toBackendEnum(requiredParam(query.type, 'Backend type'))
    const backend = await getBackend<Backend>(config, req['session'], type, backendId)
    if (!backend) throw new Error('Backend not found ' + backendId)
    try {
      sendHtml(res, 'Logged in', backendId)
    } catch (error) {
      sendHtml(res, 'Error while logging in', undefined, error, 500)
    }
  } catch (error) {
    sendHtml(res, 'Error in the request ' + error.message, undefined, error, 400)
  }
}

/**
 * Express route to logout from a backend
 */
export async function routeLogout(req, res) {
  try {
    const query = req.query as ApiBackendLogoutRequestQuery
    // Get the backend
    const backendId = requiredParam(query.backendId, 'Backend id')
    const config = requiredParam(req.app.get('config') as ServerConfig, 'Config object on express js APP')
    const type = toBackendEnum(requiredParam(query.type, 'Backend type'))
    const backend = await getBackend<Backend>(config, req['session'], type, backendId)
    if (!backend) throw new Error(`Backend not found ${backendId} ${type}`)
    try {
      // Logout
      await backend.logout(req['session'])
      // Return success
      res.json({
        error: false,
        message: 'OK',
      } as ApiResponseError)
    } catch (error) {
      console.error('Error while logging out', error)
      res.status(error?.code ?? 500).json({
        error: true,
        message: 'Error while logging out: ' + error.message,
      } as ApiResponseError)
      return
    }
  } catch (error) {
    console.error('Error in the logout request', error)
    res.status(error?.code ?? 400).json({
      error: true,
      message: 'Error in the logout request: ' + error.message,
    } as ApiResponseError)
    return
  }
}
