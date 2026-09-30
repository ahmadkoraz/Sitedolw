import React from 'react';
import { JobSiteList } from '../features/jobsites/JobSiteList';

interface JobSitesPageProps {
  onNavigateToProjects?: () => void;
}

export const JobSitesPage: React.FC<JobSitesPageProps> = ({ onNavigateToProjects }) => {
  return <JobSiteList onNavigateToProjects={onNavigateToProjects} />;
};
