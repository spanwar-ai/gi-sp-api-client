import { useEffect } from 'react';
import { useCollectionStore } from '../store/collectionStore';
import { useEnvironmentStore } from '../store/environmentStore';
import { useHistoryStore } from '../store/historyStore';
import { useResponseStore } from '../store/responseStore';
import { useRequestStore } from '../store/requestStore';
import { useUIStore } from '../store/uiStore';

export function useVsCodeMessage() {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (!message || !message.type) return;

      switch (message.type) {
        case 'activationStatus':
          useUIStore.getState().setActivation(
            message.payload.activated,
            message.payload.role,
            message.payload.expiryDate
          );
          break;

        case 'activationVerified':
          if (message.payload.success) {
            useUIStore.getState().setActivation(true, message.payload.role, null);
          }
          break;

        case 'collections':
          useCollectionStore.getState().setCollections(message.payload);
          break;

        case 'environments':
          useEnvironmentStore.getState().setEnvironments(message.payload);
          break;

        case 'history':
          useHistoryStore.getState().setEntries(message.payload);
          break;

        case 'requestResult':
          useResponseStore.getState().setResponse(message.payload.requestId, message.payload);
          useRequestStore.getState().setLoading(false);
          break;

        case 'requestError':
          useRequestStore.getState().setLoading(false);
          useUIStore.getState().addNotification('error', message.payload.error);
          break;

        case 'requestProgress':
          break;

        case 'curlGenerated':
          useResponseStore.getState().setCurl(message.payload.curl);
          break;

        case 'alCodeGenerated':
          useResponseStore.getState().setAlCode(message.payload.code);
          break;

        case 'binaryFileSelected': {
          const store = useRequestStore.getState();
          const req = store.getActiveRequest();
          if (req) {
            store.setBody({
              ...req.body,
              content: message.payload.content,
              binaryFileName: message.payload.fileName,
              binarySize: message.payload.size,
            });
          }
          break;
        }

        case 'oauth2Token': {
          const reqStore = useRequestStore.getState();
          const active = reqStore.getActiveRequest();
          if (active) {
            reqStore.setAuth({
              ...active.auth,
              accessToken: message.payload.accessToken,
              expiresAt: message.payload.expiresAt,
              refreshToken: message.payload.refreshToken,
            });
          }
          useUIStore.getState().addNotification('info', 'OAuth2 token acquired');
          break;
        }

        case 'oauth2Error':
          useUIStore.getState().addNotification('error', message.payload.error);
          break;

        case 'notification':
          useUIStore.getState().addNotification(message.payload.level, message.payload.message);
          break;

        case 'requestSaved':
          if (message.payload.success) {
            useUIStore.getState().addNotification('info', 'Request saved');
          }
          break;

        case 'collectionExported':
          break;

        case 'settings':
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
}
