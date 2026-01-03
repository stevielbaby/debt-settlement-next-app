export type DeploymentMode = 'single-tenant' | 'multi-tenant';

export interface DeploymentConfig {
  mode: DeploymentMode;
  singletonOrg: {
    id: string;
    name: string;
    email: string;
  };
  features: {
    multiOrgManagement: boolean;
    orgProvisioning: boolean;
    crossOrgAnalytics: boolean;
  };
}

export const DEPLOYMENT_CONFIG: DeploymentConfig = {
  mode: 'single-tenant',
  singletonOrg: {
    id: 'firm-singleton',
    name: 'Stratton Defense Law Firm',
    email: process.env.FIRM_EMAIL || 'admin@strattondefense.com'
  },
  features: {
    multiOrgManagement: false,
    orgProvisioning: false,
    crossOrgAnalytics: false
  }
};

// Helper functions
export const isSingleTenant = () => DEPLOYMENT_CONFIG.mode === 'single-tenant';
export const isMultiTenant = () => DEPLOYMENT_CONFIG.mode === 'multi-tenant';
export const canManageOrganizations = () => DEPLOYMENT_CONFIG.features.multiOrgManagement;

