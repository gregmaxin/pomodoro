import { useEffect, useReducer, useRef, useCallback } from "react";

const START_FETCH = "START_FETCH";
const FETCH_SUCCESS = "FETCH_SUCCESS";
const FETCH_FAILED = "FETCH_FAILED";

type Action<T> =
  | {
      type: "START_FETCH";
    }
  | {
      type: "FETCH_SUCCESS";
      value: T;
    }
  | {
      type: "FETCH_FAILED";
      error: unknown;
    };

export interface ResultObject<T> {
  value: T;
  error: unknown;
  isPending: boolean;
}

type RefetchFunc = (params?: Record<string, unknown>) => void;

type ReducerFunction<T> = (
  state: ResultObject<T>,
  action: Action<T>
) => ResultObject<T>;

function asyncFetchReducer<T>(
  state: ResultObject<T>,
  action: Action<T>
): ResultObject<T> {
  switch (action.type) {
    case START_FETCH:
      return { ...state, isPending: true };
    case FETCH_SUCCESS:
      return { ...state, error: null, value: action.value, isPending: false };
    case FETCH_FAILED:
      return { ...state, error: action.error, isPending: false };
    default:
      return state;
  }
}

export default function usePromise<ResultType>(
  queryFunc: (
    params?: Record<string, unknown> | null | any
  ) => Promise<ResultType>,
  params?: Record<string, unknown> | null,
  defaultValue?: ResultType,
  deps = []
): [ResultObject<ResultType>, RefetchFunc] {
  const subscribed = useRef<boolean>(true);
  const [result, dispatch] = useReducer<ReducerFunction<ResultType>>(
    asyncFetchReducer,
    {
      value: defaultValue,
      error: null,
      isPending: true,
    } as ResultObject<ResultType>
  );

  useEffect(() => {
    return () => {
      subscribed.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (
      fetchParams?: Record<string, unknown> | null
    ): Promise<ResultType | void> => {
      try {
        if (!subscribed.current) {
          return;
        }
        dispatch({ type: START_FETCH });
        const res = await queryFunc(fetchParams);
        if (subscribed.current) {
          dispatch({ type: FETCH_SUCCESS, value: res });
        }
      } catch (e) {
        if (subscribed.current) {
          dispatch({ type: FETCH_FAILED, error: e });
        }
      }
    },
    [queryFunc]
  );

  const refetch = useCallback(
    (refetchParams): void => {
      fetchData(refetchParams);
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...Object.values(params || {}), ...deps]);

  return [result, refetch];
}
