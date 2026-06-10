import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ApiError, BranchesResponse, CommitsResponse, FileContent, FileUpdate, GetCommitsParams, GetFileParams, GetTreeParams, HealthStatus, RepoInfo, TreeResponse, UpdateResult } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetRepoUrl: () => string;
/**
 * Returns metadata about the target GitHub repository
 * @summary Get repository info
 */
export declare const getRepo: (options?: RequestInit) => Promise<RepoInfo>;
export declare const getGetRepoQueryKey: () => readonly ["/api/github/repo"];
export declare const getGetRepoQueryOptions: <TData = Awaited<ReturnType<typeof getRepo>>, TError = ErrorType<ApiError>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRepo>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRepo>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRepoQueryResult = NonNullable<Awaited<ReturnType<typeof getRepo>>>;
export type GetRepoQueryError = ErrorType<ApiError>;
/**
 * @summary Get repository info
 */
export declare function useGetRepo<TData = Awaited<ReturnType<typeof getRepo>>, TError = ErrorType<ApiError>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRepo>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetTreeUrl: (params?: GetTreeParams) => string;
/**
 * Returns the full file/folder tree of the repository
 * @summary Get repository file tree
 */
export declare const getTree: (params?: GetTreeParams, options?: RequestInit) => Promise<TreeResponse>;
export declare const getGetTreeQueryKey: (params?: GetTreeParams) => readonly ["/api/github/tree", ...GetTreeParams[]];
export declare const getGetTreeQueryOptions: <TData = Awaited<ReturnType<typeof getTree>>, TError = ErrorType<ApiError>>(params?: GetTreeParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTree>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTree>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTreeQueryResult = NonNullable<Awaited<ReturnType<typeof getTree>>>;
export type GetTreeQueryError = ErrorType<ApiError>;
/**
 * @summary Get repository file tree
 */
export declare function useGetTree<TData = Awaited<ReturnType<typeof getTree>>, TError = ErrorType<ApiError>>(params?: GetTreeParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTree>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetFileUrl: (params: GetFileParams) => string;
/**
 * Returns the decoded content of a file
 * @summary Get file content
 */
export declare const getFile: (params: GetFileParams, options?: RequestInit) => Promise<FileContent>;
export declare const getGetFileQueryKey: (params?: GetFileParams) => readonly ["/api/github/file", ...GetFileParams[]];
export declare const getGetFileQueryOptions: <TData = Awaited<ReturnType<typeof getFile>>, TError = ErrorType<ApiError>>(params: GetFileParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFile>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFileQueryResult = NonNullable<Awaited<ReturnType<typeof getFile>>>;
export type GetFileQueryError = ErrorType<ApiError>;
/**
 * @summary Get file content
 */
export declare function useGetFile<TData = Awaited<ReturnType<typeof getFile>>, TError = ErrorType<ApiError>>(params: GetFileParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateFileUrl: () => string;
/**
 * Creates or updates a file in the repository
 * @summary Update file content
 */
export declare const updateFile: (fileUpdate: FileUpdate, options?: RequestInit) => Promise<UpdateResult>;
export declare const getUpdateFileMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFile>>, TError, {
        data: BodyType<FileUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateFile>>, TError, {
    data: BodyType<FileUpdate>;
}, TContext>;
export type UpdateFileMutationResult = NonNullable<Awaited<ReturnType<typeof updateFile>>>;
export type UpdateFileMutationBody = BodyType<FileUpdate>;
export type UpdateFileMutationError = ErrorType<ApiError>;
/**
* @summary Update file content
*/
export declare const useUpdateFile: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFile>>, TError, {
        data: BodyType<FileUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateFile>>, TError, {
    data: BodyType<FileUpdate>;
}, TContext>;
export declare const getGetBranchesUrl: () => string;
/**
 * Returns a list of branches in the repository
 * @summary Get repository branches
 */
export declare const getBranches: (options?: RequestInit) => Promise<BranchesResponse>;
export declare const getGetBranchesQueryKey: () => readonly ["/api/github/branches"];
export declare const getGetBranchesQueryOptions: <TData = Awaited<ReturnType<typeof getBranches>>, TError = ErrorType<ApiError>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBranches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBranches>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBranchesQueryResult = NonNullable<Awaited<ReturnType<typeof getBranches>>>;
export type GetBranchesQueryError = ErrorType<ApiError>;
/**
 * @summary Get repository branches
 */
export declare function useGetBranches<TData = Awaited<ReturnType<typeof getBranches>>, TError = ErrorType<ApiError>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBranches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetCommitsUrl: (params?: GetCommitsParams) => string;
/**
 * Returns recent commit history for the repository or a specific file
 * @summary Get recent commits
 */
export declare const getCommits: (params?: GetCommitsParams, options?: RequestInit) => Promise<CommitsResponse>;
export declare const getGetCommitsQueryKey: (params?: GetCommitsParams) => readonly ["/api/github/commits", ...GetCommitsParams[]];
export declare const getGetCommitsQueryOptions: <TData = Awaited<ReturnType<typeof getCommits>>, TError = ErrorType<unknown>>(params?: GetCommitsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCommits>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCommits>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCommitsQueryResult = NonNullable<Awaited<ReturnType<typeof getCommits>>>;
export type GetCommitsQueryError = ErrorType<unknown>;
/**
 * @summary Get recent commits
 */
export declare function useGetCommits<TData = Awaited<ReturnType<typeof getCommits>>, TError = ErrorType<unknown>>(params?: GetCommitsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCommits>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map