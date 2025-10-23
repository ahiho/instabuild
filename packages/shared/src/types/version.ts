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

export interface VersionList {
  versions: LandingPageVersion[];
}
