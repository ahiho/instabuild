import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VersionSelectorProps {
  pageId: string;
  currentVersionNumber: number;
  onVersionChange?: (versionNumber: number) => void;
}

/**
 * VersionSelector component - Dropdown select for version selection
 *
 * Features:
 * - Dropdown select showing current version
 * - Dark theme styling
 * - Accessible via keyboard
 * - TODO: Fetch version list from API
 */
export function VersionSelector({
  pageId: _pageId, // eslint-disable-line @typescript-eslint/no-unused-vars -- Will be used when react-query is implemented
  currentVersionNumber,
  onVersionChange,
}: VersionSelectorProps) {
  // TODO: Fetch version history using react-query
  // const { data: versions } = useQuery({
  //   queryKey: ['versions', _pageId],
  //   queryFn: () => fetchVersions(_pageId),
  // });

  // For now, just show current version
  // In the future, this will be populated from API
  const versions = [
    { number: 1, label: 'v1 - Initial' },
    {
      number: currentVersionNumber,
      label: `v${currentVersionNumber} - Current`,
    },
  ];

  return (
    <Select
      value={currentVersionNumber.toString()}
      onValueChange={value => {
        const versionNumber = parseInt(value, 10);
        onVersionChange?.(versionNumber);
      }}
    >
      <SelectTrigger className="w-[140px] bg-gray-800/50 border-gray-700 text-gray-300 text-sm h-8">
        <SelectValue placeholder="Select version" />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-gray-800 text-white">
        {versions.map(version => (
          <SelectItem
            key={version.number}
            value={version.number.toString()}
            className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
          >
            {version.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
