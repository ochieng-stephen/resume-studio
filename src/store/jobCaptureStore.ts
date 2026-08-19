import { create } from "zustand";

interface JobCaptureState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useJobCaptureStore = create<JobCaptureState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
