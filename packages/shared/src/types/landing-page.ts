export interface LandingPage {
  id: string;
  title: string;
  description?: string;
  githubRepoUrl: string;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandingPageRequest {
  title: string;
  description?: string;
}

export interface UpdateLandingPageRequest {
  title?: string;
  description?: string;
}

export interface LandingPageWithVersions extends LandingPage {
  versions: LandingPageVersion[];
  currentVersion?: LandingPageVersion;
}

export interface LandingPageVersion {
  id: string;
  landingPageId: string;
  versionNumber: number;
  commitSha: string;
  sourceCode: string;
  previewUrl?: string;
  changeDescription?: string;
  createdAt: string;
}
