import { useCallback } from 'react';
import { useRequestStore } from '../store/requestStore';
import { messageService } from '../services/messageService';

export function useRequest() {
  const { isLoading, setLoading, getActiveRequest } = useRequestStore();

  const send = useCallback(() => {
    const request = getActiveRequest();
    if (!request || !request.url) return;

    setLoading(true, request.id);
    messageService.sendRequest(request);
  }, [getActiveRequest, setLoading]);

  const cancel = useCallback(() => {
    const request = getActiveRequest();
    if (request) {
      messageService.cancelRequest(request.id);
      setLoading(false);
    }
  }, [getActiveRequest, setLoading]);

  const generateCurl = useCallback(() => {
    const request = getActiveRequest();
    if (request) {
      messageService.generateCurl(request);
    }
  }, [getActiveRequest]);

  const generateAlCode = useCallback(() => {
    const request = getActiveRequest();
    if (request) {
      messageService.generateAlCode(request);
    }
  }, [getActiveRequest]);

  return { send, cancel, generateCurl, generateAlCode, isLoading };
}
