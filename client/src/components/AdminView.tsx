import React, { useState } from 'react';
import { User, JobRole } from '../types';

const AdminView: React.FC = () => {
  const [candidates, setCandidates] = useState<User[]>([]);
  const [selectedJobRole, setSelectedJobRole] = useState<JobRole | null>(null);

  const fetchCandidates = async (jobRoleId: number) => {
    try {
      const response = await fetch(`/api/candidates/${jobRoleId}`);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const data = await response.json();
      setCandidates(data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  return (
    <div className="p-4">
      {selectedJobRole && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Candidates for {selectedJobRole.title}</h3>
          <div className="space-y-2">
            {candidates.map(candidate => (
              <div key={candidate.id} className="p-2 border rounded">
                <p className="font-medium">{candidate.name}</p>
                <p className="text-sm text-gray-600">{candidate.email}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView; 