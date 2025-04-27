import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  FileTextIcon, 
  UserCheckIcon, 
  ClipboardCheckIcon 
} from "lucide-react";

interface StatsCardsProps {
  totalResumes: number;
  qualifiedCandidates: number;
  completedExams: number;
}

export function StatsCards({ 
  totalResumes, 
  qualifiedCandidates, 
  completedExams 
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* Processed Resumes Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
              <FileTextIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Processed Resumes
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {totalResumes}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                  <ArrowUpIcon className="self-center flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                  <span className="sr-only">Increased by</span>
                  12%
                </div>
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Qualified Candidates Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <UserCheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Qualified Candidates
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {qualifiedCandidates}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                  <ArrowUpIcon className="self-center flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                  <span className="sr-only">Increased by</span>
                  8%
                </div>
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Exams Completed Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
              <ClipboardCheckIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Exams Completed
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {completedExams}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                  <ArrowDownIcon className="self-center flex-shrink-0 h-5 w-5 text-red-500" aria-hidden="true" />
                  <span className="sr-only">Decreased by</span>
                  5%
                </div>
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
