interface VercelDeployment {
  id: string;
  url: string;
  state: string;
}

class VercelClient {
  private token: string;
  private baseUrl = 'https://api.vercel.com';

  constructor(token: string) {
    this.token = token;
  }

  async createDeployment(
    projectName: string,
    files: Record<string, string>
  ): Promise<VercelDeployment> {
    const response = await fetch(`${this.baseUrl}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        files: Object.entries(files).map(([file, data]) => ({
          file,
          data,
        })),
        projectSettings: {
          framework: 'vite',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Vercel deployment failed: ${response.statusText}`);
    }

    const result = (await response.json()) as VercelDeployment;
    return result;
  }
}

const vercelClient = new VercelClient(process.env.VERCEL_TOKEN || '');

export { vercelClient };
