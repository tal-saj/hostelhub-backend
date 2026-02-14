const { cloudinary, deleteFromCloudinary, cnicStorage, propertyStorage, profileStorage } = require('../../utils/cloudinary');

// Mock the cloudinary uploader
jest.mock('cloudinary', () => {
  const destroyMock = jest.fn();
  return {
    v2: {
      config: jest.fn(),
      uploader: {
        destroy: destroyMock,
      },
    },
  };
});

describe('Cloudinary Configuration & Utilities', () => {
  const cloudinaryModule = require('cloudinary').v2;

  beforeEach(() => {
    jest.clearAllMocks();
  });



  test('should return true when deleteFromCloudinary succeeds', async () => {
    cloudinaryModule.uploader.destroy.mockResolvedValue({ result: 'ok' });

    const result = await deleteFromCloudinary('sample-id');
    expect(result).toBe(true);
    expect(cloudinaryModule.uploader.destroy).toHaveBeenCalledWith('sample-id');
  });

  test('should return false when deleteFromCloudinary fails', async () => {
    cloudinaryModule.uploader.destroy.mockRejectedValue(new Error('fail'));

    const result = await deleteFromCloudinary('sample-id');
    expect(result).toBe(false);
    expect(cloudinaryModule.uploader.destroy).toHaveBeenCalledWith('sample-id');
  });

  test('cnicStorage should be configured for correct folder', () => {
    expect(cnicStorage).toHaveProperty('_handleFile');
    expect(cnicStorage).toHaveProperty('cloudinary');
    expect(cnicStorage.params.folder).toBe('hostelhub/users/cnic');
  });

  test('propertyStorage should be configured for correct folder', () => {
    expect(propertyStorage).toHaveProperty('params');
    expect(propertyStorage.params.folder).toBe('hostelhub/properties');
  });

  test('profileStorage should be configured for correct folder', () => {
    expect(profileStorage).toHaveProperty('params');
    expect(profileStorage.params.folder).toBe('hostelhub/users/profile');
  });
});
