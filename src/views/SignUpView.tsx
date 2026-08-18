// src/views/SignUpView.tsx - Only the critical modified parts shown
// Keep all imports and other code the same, just replace the handleSignUpSubmit function

  /**
   * Direct Account Registration Submission - PRODUCTION READY
   */
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!workEmail.trim() || !workEmail.includes('@')) {
      setError('Please provide a valid work email address.');
      return;
    }
    if (!companyName.trim()) {
      setError('Please provide your company or workspace name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!agreeTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to create a workspace.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionProgress('Creating account & initializing database...');

    try {
      // 1. Save company profile locally
      companyService.saveProfile({
        companyName: companyName.trim() || 'My Company',
        industry: selectedIndustry
      });

      // 2. Register user in Neon DB via backend API
      const registerResult = await authService.register({
        fullName: fullName.trim(),
        email: workEmail.trim().toLowerCase(),
        companyName: companyName.trim(),
        companySize: companySize,
        role: rolePersona,
        selectedPlan: selectedPlan,
        password: password
      });

      if (!registerResult) {
        throw new Error('Registration failed. Please try again.');
      }

      // 3. Upgrade subscription plan
      subscriptionService.upgradeOrChangePlan(selectedPlan, 'annual');

      // 4. Adapt CRM to company's industry (doesn't override existing data)
      crmStore.adaptToCompanyProfile(selectedIndustry, companyName.trim() || 'My Company');

      setIsSubmitting(false);
      onSignUpSuccess();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to create workspace account. Please check your details or try signing in.');
    }
  };
