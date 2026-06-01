import React from 'react';
import { useEnvironmentStore } from '../../store/environmentStore';
import { messageService } from '../../services/messageService';
import { Select } from '../common/Select';

export function EnvironmentSelector() {
  const { environments } = useEnvironmentStore();

  const activeEnv = environments.find((e) => e.isActive);

  const options = [
    { value: '', label: 'No Environment' },
    ...environments.map((env) => ({
      value: env.id,
      label: env.name,
    })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    messageService.setActiveEnvironment(value || null);
  };

  return (
    <Select
      options={options}
      value={activeEnv?.id ?? ''}
      onChange={handleChange}
      className="min-w-[140px]"
    />
  );
}
