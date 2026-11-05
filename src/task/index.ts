import { videoSearchTask } from "./videoSearch";

export type { Task } from "./types";

/** 지금 응시자에게 내는 과제. 과제를 바꾸려면 여기만 바꾼다. */
export const currentTask = videoSearchTask;
