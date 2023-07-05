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

/**
 * @fileoverview define types for Silex client and server
 */

// Publication API
export interface PublicationSettings {
  backend?: BackendData, // Set by the postMessage from the login callback page
  url?: string, // URL to display where the website is published to
  autoHomePage?: boolean, // Name the first page `index` instead of its name
  assets?: {
    path?: string, // Folder to copy assets to
    url?: string, // URL where assets are accessed
  },
  html?: {
    path?: string, // Folder where to generate the HTML pages
    ext?: string, // File extension for HTML pages
  },
  css?: {
    path?: string, // Folder where to generate the CSS files
    url?: string, // URL of the Folder where the CSS files are accessed
    ext?: string, // File extension for CSS files
  },
}

export interface WebsiteFile {
  html: string,
  css: string,
  htmlPath: string,
  cssPath: string,
}

export type ApiResponseError = { message: string }
export type ApiPublicationPublishRequestBody = WebsiteData
export type ApiPublicationPublishRequestQuery = { id: WebsiteId }
export type ApiPublicationPublishResponse = { url: string, job: PublicationJobData }
export type ApiPublicationStatusRequestQuery = { jobId: JobId }
export type ApiPublicationStatusResponse = PublicationJobData
export type ApiWebsiteReadRequestQuery = { id?: WebsiteId, backendId?: BackendId }
export type ApiWebsiteReadResponse = WebsiteMeta[] | WebsiteData
export type ApiWebsiteWriteRequestQuery = { id: WebsiteId, backendId?: BackendId }
export type ApiWebsiteWriteRequestBody = WebsiteData
export type ApiWebsiteWriteResponse = { message: string }
export type ApiWebsiteDeleteRequestQuery = { id: WebsiteId, backendId?: BackendId }
export type ApiWebsiteAssetsReadRequestQuery = { id: WebsiteId, backendId?: BackendId }
export type ApiWebsiteAssetsReadRequestParams = { path: string }
export type ApiWebsiteAssetsReadResponse = string
export type ApiWebsiteAssetsWriteRequestQuery = { id: WebsiteId, backendId?: BackendId }
export type ApiWebsiteAssetsWriteRequestBody = ClientSideFile[]
export type ApiWebsiteAssetsWriteResponse = { data: string[] }
export type ApiBackendListRequestQuery = { type: BackendType }
export type ApiBackendListResponse = BackendData[]
export type ApiBackendLoginRequestQuery = { backendId: BackendId, type: BackendType, options?: string, error?: string }
export type ApiBackendLoggedInPostMessage = { type: string, error: boolean, message: string, backendId: BackendId }
export type ApiBackendLogoutRequestQuery = { backendId: BackendId, type: BackendType }
export type ApiBackendLoginStatusRequestQuery = { id?: WebsiteId, backendId?: BackendId, type: BackendType }
export type ApiBackendLoginStatusResponse = { user: BackendUser, backend: BackendData, websiteMeta?: WebsiteMeta}

// **
// Website API
export interface WebsiteData {
  pages: Page[],
  assets: Asset[],
  styles: Style[],
  name: string,
  settings: WebsiteSettings,
  fonts: Font[],
  symbols: symbol[],
  publication: PublicationSettings,
}

export interface PublicationData extends WebsiteData {
  files?: WebsiteFile[], // Added by the client for publish
}

export interface WebsiteSettings {
  description: string,
  title: string,
  lang: string,
  head: string,
  favicon: string,
  'og:title': string,
  'og:description': string,
  'og:image': string,
}

export interface Font {
  name: string,
  value: string,
  variants: string[],
}

export interface Page {
  name?: string,
  id: string,
  type?: string,
  frames: Frame[],
  settings?: WebsiteSettings,
  cssExt?: string,
  htmlExt?: string,
}

export interface Frame {
  component: { type: string, stylable: string[] },
  components: Component[],
}

export interface Component {
  type: string,
  content?: string,
  attributes: { [key: string]: string },
  conponents: Component[],
}

export enum Unit {
  PX = 'px',
}

export interface Asset     {
  type: string,
  src: string,
  unitDim: Unit,
  height: number,
  width: number,
  name: string,
}

export interface Style {
  selectors: Selector[],
  style: { [key: string]: string },
}

export type Selector = string | {
  name: string,
  type: number,
}

// **
// Backend API
/**
 * Type for a backend id
 */
export type BackendId = string

/**
 * Type for a client side file
 * @see backend/File
 */
export interface ClientSideFile {
  path: string,
  content: Buffer | string
}

/**
 * Type for file listing
 */
export interface FileMeta {
  name: string
  isDir: boolean
  size: number
  createdAt: Date
  updatedAt: Date
  metadata?: object
}

/**
 * Enum to express if the backend is a storage or a hosting
 */
export enum BackendType {
  STORAGE = 'STORAGE',
  HOSTING = 'HOSTING',
}

/**
 * Type for a website id
 */
export type WebsiteId = string

/**
 * Back end data sent to the front end
 */
export interface BackendData {
  backendId: BackendId
  type: BackendType
  displayName: string
  icon: string
  disableLogout: boolean
  isLoggedIn: boolean
  authUrl: string | null
}

/**
 * Back end data sent to the front end
 */
export interface BackendUser {
  name: string
  email?: string
  picture?: string
  metadata?: object
}

/**
 * Back end data sent to the front end
 * Meta data can be the root path of the websites, or the bucket name, etc.
 */
export interface WebsiteMeta {
  websiteId: WebsiteId
  createdAt: Date
  updatedAt: Date
  metadata?: object
}

/**
 * Enum to express if the job is in progress or finished or errored
 */
export enum JobStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

/**
 * Id used to track the progress of a publication
 */
export type JobId = string

/**
 * Data structure which is sent to the client to display the progress of a job
 */
export interface JobData {
  jobId: JobId // The job id
  status: JobStatus // status code
  message: string // status to display
  url?: string // url of the published website
  _timeout?: ReturnType<typeof setTimeout> // Internal use
}

export interface PublicationJobData extends JobData {
  logs: string[][]
  errors: string[][]
}
