package main

import (
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

var (
	currentCPU float64
	cpuMutex   sync.Mutex
)

type SystemStats struct {
	CPUUsage float64 `json:"cpu"`
	RAMUsage float64 `json:"ram"`
	TotalRAM uint64  `json:"total_ram"`
	UsedRAM  uint64  `json:"used_ram"`
}

func StartCPUTracker() {
	go func() {
		for {
			c, err := cpu.Percent(time.Second, false)
			if err == nil && len(c) > 0 {
				cpuMutex.Lock()
				currentCPU = c[0]
				cpuMutex.Unlock()
			}
			time.Sleep(500 * time.Millisecond)
		}
	}()
}

func GetSystemStats() (SystemStats, error) {
	v, err := mem.VirtualMemory()
	if err != nil {
		return SystemStats{}, err
	}

	cpuMutex.Lock()
	cpuVal := currentCPU
	cpuMutex.Unlock()

	return SystemStats{
		CPUUsage: cpuVal,
		RAMUsage: v.UsedPercent,
		TotalRAM: v.Total,
		UsedRAM:  v.Used,
	}, nil
}
