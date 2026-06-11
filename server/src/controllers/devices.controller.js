const deviceService = require('../services/device.service');

async function getDevices(req, res) {
  try {
    const includeDeleted =
      req.user?.role === 'admin' && String(req.query.includeDeleted) === 'true';
    const devices = await deviceService.listDevices({ includeDeleted });
    res.json(devices);
  } catch (error) {
    console.error('getDevices error:', error.message);
    res.status(500).json({ message: 'Failed to load devices' });
  }
}

async function getDeviceById(req, res) {
  try {
    const includeDeleted =
      req.user?.role === 'admin' && String(req.query.includeDeleted) === 'true';
    const device = await deviceService.getDeviceById(req.params.id, { includeDeleted });
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }
    res.json(device);
  } catch (error) {
    console.error('getDeviceById error:', error.message);
    res.status(500).json({ message: 'Failed to load device' });
  }
}

async function createDevice(req, res) {
  try {
    const device = await deviceService.createDevice(req.body || {});
    res.status(201).json(device);
  } catch (error) {
    if (error.status === 400) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('createDevice error:', error.message);
    res.status(500).json({ message: 'Failed to create device' });
  }
}

async function updateDevice(req, res) {
  try {
    const device = await deviceService.updateDevice(req.params.id, req.body || {});
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }
    res.json(device);
  } catch (error) {
    if (error.status === 400) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('updateDevice error:', error.message);
    res.status(500).json({ message: 'Failed to update device' });
  }
}

async function deleteDevice(req, res) {
  try {
    const device = await deviceService.softDeleteDevice(req.params.id);
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }
    res.json({ success: true, device });
  } catch (error) {
    if (error.status === 400) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('deleteDevice error:', error.message);
    res.status(500).json({ message: 'Failed to delete device' });
  }
}

module.exports = {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice
};