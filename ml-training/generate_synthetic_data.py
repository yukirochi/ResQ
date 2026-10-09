"""
ResQ RSSI Synthetic RF Data Generator
Simulates indoor radio frequency multipath fading, log-distance path loss,
wall/debris obstacles, and dynamic rescuer walking trajectories.
"""

import os
import json
import numpy as np

def simulate_trajectory(num_seconds=120, sample_rate_hz=3, tx_power_1m=-59.0, path_loss_n=2.8):
    """
    Simulates a rescuer walking towards or around a victim trapped in debris.
    """
    total_samples = int(num_seconds * sample_rate_hz)
    time_steps = np.linspace(0, num_seconds, total_samples)
    
    # Simulate rescuer walking from 18 meters away down to 0.8 meters
    # with momentary pauses, turns, and searching patterns
    base_distance = 18.0 - 15.0 * (time_steps / num_seconds) + np.sin(time_steps * 0.1) * 1.5
    distance = np.clip(base_distance, 0.4, 25.0)
    
    # Path loss model
    true_rssi = tx_power_1m - 10.0 * path_loss_n * np.log10(distance)
    
    # Add RF phenomena:
    # 1. Shadowing / Obstacle drops (e.g. wall/debris between second 40 and 70)
    obstacle = np.zeros(total_samples)
    obstacle[int(total_samples * 0.35):int(total_samples * 0.65)] = -10.5
    
    # 2. Gaussian thermal noise
    gaussian_noise = np.random.normal(0, 3.2, total_samples)
    
    # 3. Rayleigh multipath fading
    rayleigh = np.random.rayleigh(scale=1.5, size=total_samples) - 1.8
    
    noisy_rssi = true_rssi + obstacle + gaussian_noise + rayleigh
    noisy_rssi = np.clip(np.round(noisy_rssi), -110, -25)
    
    return distance, true_rssi, noisy_rssi

def build_dataset(num_trajectories=100, window_size=30, output_dir="data/processed"):
    os.makedirs(output_dir, exist_ok=True)
    
    X_windows = []
    y_clean_rssi = []
    y_distances = []
    y_zones = [] # 0: IMMEDIATE (<2m), 1: NEAR (<5m), 2: FAR (>=5m)
    
    print(f"Generating {num_trajectories} synthetic RF disaster scenarios...")
    
    for i in range(num_trajectories):
        dist, true_rssi, noisy_rssi = simulate_trajectory()
        
        for t in range(window_size, len(noisy_rssi)):
            window = noisy_rssi[t - window_size:t]
            target_rssi = true_rssi[t]
            target_dist = dist[t]
            
            if target_dist <= 2.2:
                zone = 0 # IMMEDIATE
            elif target_dist <= 5.5:
                zone = 1 # NEAR
            else:
                zone = 2 # FAR
                
            X_windows.append(window)
            y_clean_rssi.append(target_rssi)
            y_distances.append(target_dist)
            y_zones.append(zone)
            
    X_arr = np.array(X_windows, dtype=np.float32)
    y_rssi_arr = np.array(y_clean_rssi, dtype=np.float32)
    y_dist_arr = np.array(y_distances, dtype=np.float32)
    y_zone_arr = np.array(y_zones, dtype=np.int64)
    
    np.save(os.path.join(output_dir, "X_windows.npy"), X_arr)
    np.save(os.path.join(output_dir, "y_clean_rssi.npy"), y_rssi_arr)
    np.save(os.path.join(output_dir, "y_distances.npy"), y_dist_arr)
    np.save(os.path.join(output_dir, "y_zones.npy"), y_zone_arr)
    
    print(f"Saved dataset: {len(X_arr)} sliding window samples into {output_dir}/")
    print(f"Window shape: {X_arr.shape}")

if __name__ == "__main__":
    build_dataset()
