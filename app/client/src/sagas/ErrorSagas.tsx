import _ from "lodash";
import {
  ReduxActionTypes,
  ReduxActionErrorTypes,
  ReduxAction,
} from "constants/ReduxActionConstants";
import { DEFAULT_ERROR_MESSAGE, DEFAULT_ACTION_ERROR } from "constants/errors";
import { ApiResponse } from "api/ApiResponses";
import { put, takeLatest, call } from "redux-saga/effects";
import { ERROR_401, ERROR_500, ERROR_0 } from "constants/messages";
import { Variant } from "components/ads/common";
import { Toaster } from "components/ads/Toast";
import log from "loglevel";
import { axiosConnectionAbortedCode } from "../api/Api";

export function* callAPI(apiCall: any, requestPayload: any) {
  try {
    return yield call(apiCall, requestPayload);
  } catch (error) {
    return yield error;
  }
}
const getErrorMessage = (code: number) => {
  switch (code) {
    case 401:
      return ERROR_401;
    case 500:
      return ERROR_500;
    case 0:
      return ERROR_0;
  }
};

export function* validateResponse(response: ApiResponse | any, show = true) {
  if (!response) {
    throw Error("");
  }
  if (!response.responseMeta && !response.status) {
    throw Error(getErrorMessage(0));
  }
  if (!response.responseMeta && response.status) {
    throw Error(getErrorMessage(response.status));
  }
  if (response.responseMeta.success) {
    return true;
  } else {
    yield put({
      type: ReduxActionErrorTypes.API_ERROR,
      payload: {
        error: response.responseMeta.error,
        show,
      },
    });
    throw Error(response.responseMeta.error.message);
  }
}

export function getResponseErrorMessage(response: ApiResponse) {
  return response.responseMeta.error
    ? response.responseMeta.error.message
    : undefined;
}

type ErrorPayloadType = { code?: number | string; message?: string };
let ActionErrorDisplayMap: {
  [key: string]: (error: ErrorPayloadType) => string;
} = {};

Object.keys(ReduxActionErrorTypes).forEach((type: string) => {
  ActionErrorDisplayMap[type] = () =>
    DEFAULT_ERROR_MESSAGE + " action: " + type;
});

ActionErrorDisplayMap = {
  ...ActionErrorDisplayMap,
  [ReduxActionErrorTypes.API_ERROR]: error =>
    _.get(error, "message", DEFAULT_ERROR_MESSAGE),
  [ReduxActionErrorTypes.FETCH_PAGE_ERROR]: () =>
    DEFAULT_ACTION_ERROR("fetching the page"),
  [ReduxActionErrorTypes.SAVE_PAGE_ERROR]: () =>
    DEFAULT_ACTION_ERROR("saving the page"),
};

export function* errorSaga(
  errorAction: ReduxAction<{ error: ErrorPayloadType; show?: boolean }>,
) {
  // Just a pass through for now.
  // Add procedures to customize errors here
  log.debug(`Error in action ${errorAction.type}`);
  log.error(errorAction.payload.error);
  // Show a toast when the error occurs
  const {
    type,
    payload: { error, show = true },
  } = errorAction;

  const message =
    error && error.message ? error.message : ActionErrorDisplayMap[type](error);

  if (show && error) {
    // TODO Make different error channels.
    Toaster.show({ text: message, variant: Variant.danger });
  }

  yield put({
    type: ReduxActionTypes.REPORT_ERROR,
    payload: {
      message: errorAction.payload.error,
      source: errorAction.type,
    },
  });
}

export default function* errorSagas() {
  yield takeLatest(Object.values(ReduxActionErrorTypes), errorSaga);
}
