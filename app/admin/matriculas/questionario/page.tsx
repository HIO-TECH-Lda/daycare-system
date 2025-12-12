'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, X, File } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mockClasses } from '@/lib/mock-data';

const TOTAL_STEPS = 7;

export default function QuestionarioInscricaoPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Child's Data
    childName: '',
    birthDate: '',
    age: '',
    gender: '',
    nationality: '',
    address: '',
    languagesSpoken: '',
    
    // Step 2: Guardians
    guardian1Name: '',
    guardian1Profession: '',
    guardian1Workplace: '',
    guardian1Phone: '',
    guardian1Email: '',
    guardian2Name: '',
    guardian2Profession: '',
    guardian2Workplace: '',
    guardian2Phone: '',
    guardian2Email: '',
    authorizedPickupName: '',
    authorizedPickupKinship: '',
    
    // Step 3: Health & Special Care
    hasHealthCondition: '',
    healthConditionDetails: '',
    usesMedication: '',
    medicationDetails: '',
    hasDietaryRestrictions: '',
    dietaryRestrictionsDetails: '',
    
    // Step 4: Routine & Behavior
    sleepSchedule: '',
    preferredFoods: '',
    separationReaction: '',
    playsWithOthers: '',
    behaviorNotes: '',
    
    // Step 5: School Information
    previouslyAttendedCenter: '',
    previousCenterName: '',
    transferReason: '',
    
    // Step 6: Image Authorization
    imageUsageAuthorized: false,
    
    // Step 7: Documents & Signature
    signature: '',
    enrollmentDate: '',
    documents: {
      birthCertificate: { file: null as File | null, verified: false },
      guardianId: { file: null as File | null, verified: false },
      proofOfResidence: { file: null as File | null, verified: false },
      childPhoto: { file: null as File | null, verified: false },
      vaccinationRecord: { file: null as File | null, verified: false },
    },
    
    classId: '',
  });

  // Calculate age from birth date
  useEffect(() => {
    if (formData.birthDate) {
      const birth = new Date(formData.birthDate);
      const today = new Date();
      let years = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        years--;
      }
      setFormData(prev => ({ ...prev, age: years.toString() }));
    }
  }, [formData.birthDate]);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual submission to database
    alert('Questionário de inscrição submetido com sucesso!');
    router.push('/admin/matriculas');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.childName && formData.birthDate && formData.gender && formData.nationality && formData.address);
      case 2:
        return !!(formData.guardian1Name && formData.guardian1Phone && formData.guardian1Email);
      case 3:
        return true; // All fields optional with conditional logic
      case 4:
        return true; // All fields optional
      case 5:
        return true; // Conditional for ages 3+
      case 6:
        return true; // Just checkbox
      case 7:
        return !!(formData.signature && formData.enrollmentDate && formData.classId);
      default:
        return false;
    }
  };

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    return years;
  };

  const showSchoolInfo = calculateAge(formData.birthDate) >= 3;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Questionário de Inscrição – Centro Infantil Sonho de Criança
          </h1>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-gray-600 mt-2">
          Passo {currentStep} de {TOTAL_STEPS}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Child's Data */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">1. Dados da Criança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="childName">Nome completo da criança *</Label>
                <Input
                  id="childName"
                  value={formData.childName}
                  onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    value={`${formData.age} anos`}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sexo *</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Masculino" id="masculino" />
                    <Label htmlFor="masculino" className="font-normal cursor-pointer">Masculino</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Feminino" id="feminino" />
                    <Label htmlFor="feminino" className="font-normal cursor-pointer">Feminino</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nacionalidade *</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="languagesSpoken">Língua(s) falada(s) em casa</Label>
                <Input
                  id="languagesSpoken"
                  value={formData.languagesSpoken}
                  onChange={(e) => setFormData({ ...formData, languagesSpoken: e.target.value })}
                  placeholder="Ex: Português, Inglês"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Guardians Information */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">2. Informações dos Pais ou Encarregados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold text-lg">Pai / Encarregado 1</h3>
                <div className="space-y-2">
                  <Label htmlFor="guardian1Name">Nome completo *</Label>
                  <Input
                    id="guardian1Name"
                    value={formData.guardian1Name}
                    onChange={(e) => setFormData({ ...formData, guardian1Name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian1Profession">Profissão</Label>
                  <Input
                    id="guardian1Profession"
                    value={formData.guardian1Profession}
                    onChange={(e) => setFormData({ ...formData, guardian1Profession: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian1Workplace">Local de trabalho</Label>
                  <Input
                    id="guardian1Workplace"
                    value={formData.guardian1Workplace}
                    onChange={(e) => setFormData({ ...formData, guardian1Workplace: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian1Phone">Telefone *</Label>
                  <Input
                    id="guardian1Phone"
                    type="tel"
                    value={formData.guardian1Phone}
                    onChange={(e) => setFormData({ ...formData, guardian1Phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian1Email">E-mail *</Label>
                  <Input
                    id="guardian1Email"
                    type="email"
                    value={formData.guardian1Email}
                    onChange={(e) => setFormData({ ...formData, guardian1Email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold text-lg">Mãe / Encarregada 2</h3>
                <div className="space-y-2">
                  <Label htmlFor="guardian2Name">Nome completo</Label>
                  <Input
                    id="guardian2Name"
                    value={formData.guardian2Name}
                    onChange={(e) => setFormData({ ...formData, guardian2Name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian2Profession">Profissão</Label>
                  <Input
                    id="guardian2Profession"
                    value={formData.guardian2Profession}
                    onChange={(e) => setFormData({ ...formData, guardian2Profession: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian2Workplace">Local de trabalho</Label>
                  <Input
                    id="guardian2Workplace"
                    value={formData.guardian2Workplace}
                    onChange={(e) => setFormData({ ...formData, guardian2Workplace: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian2Phone">Telefone</Label>
                  <Input
                    id="guardian2Phone"
                    type="tel"
                    value={formData.guardian2Phone}
                    onChange={(e) => setFormData({ ...formData, guardian2Phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian2Email">E-mail</Label>
                  <Input
                    id="guardian2Email"
                    type="email"
                    value={formData.guardian2Email}
                    onChange={(e) => setFormData({ ...formData, guardian2Email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Pessoa autorizada a buscar a criança</h3>
                <div className="space-y-2">
                  <Label htmlFor="authorizedPickupName">Nome</Label>
                  <Input
                    id="authorizedPickupName"
                    value={formData.authorizedPickupName}
                    onChange={(e) => setFormData({ ...formData, authorizedPickupName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorizedPickupKinship">Grau de parentesco</Label>
                  <Input
                    id="authorizedPickupKinship"
                    value={formData.authorizedPickupKinship}
                    onChange={(e) => setFormData({ ...formData, authorizedPickupKinship: e.target.value })}
                    placeholder="Ex: Avó, Tio"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Health & Special Care */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-blue-600">3. Saúde e Cuidados Especiais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>A criança tem alguma condição de saúde ou alergia?</Label>
                <RadioGroup
                  value={formData.hasHealthCondition}
                  onValueChange={(value) => setFormData({ ...formData, hasHealthCondition: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Sim" id="health-sim" />
                    <Label htmlFor="health-sim" className="font-normal cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Não" id="health-nao" />
                    <Label htmlFor="health-nao" className="font-normal cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
                {formData.hasHealthCondition === 'Sim' && (
                  <Textarea
                    placeholder="Se sim, especifique:"
                    value={formData.healthConditionDetails}
                    onChange={(e) => setFormData({ ...formData, healthConditionDetails: e.target.value })}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Usa algum medicamento regularmente?</Label>
                <RadioGroup
                  value={formData.usesMedication}
                  onValueChange={(value) => setFormData({ ...formData, usesMedication: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Sim" id="med-sim" />
                    <Label htmlFor="med-sim" className="font-normal cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Não" id="med-nao" />
                    <Label htmlFor="med-nao" className="font-normal cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
                {formData.usesMedication === 'Sim' && (
                  <Input
                    placeholder="Se sim, qual?"
                    value={formData.medicationDetails}
                    onChange={(e) => setFormData({ ...formData, medicationDetails: e.target.value })}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Possui restrições alimentares?</Label>
                <RadioGroup
                  value={formData.hasDietaryRestrictions}
                  onValueChange={(value) => setFormData({ ...formData, hasDietaryRestrictions: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Sim" id="diet-sim" />
                    <Label htmlFor="diet-sim" className="font-normal cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Não" id="diet-nao" />
                    <Label htmlFor="diet-nao" className="font-normal cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
                {formData.hasDietaryRestrictions === 'Sim' && (
                  <Input
                    placeholder="Quais?"
                    value={formData.dietaryRestrictionsDetails}
                    onChange={(e) => setFormData({ ...formData, dietaryRestrictionsDetails: e.target.value })}
                    className="mt-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Routine & Behavior */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-blue-600">4. Rotina e Comportamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sleepSchedule">Horário habitual de sono</Label>
                <Input
                  id="sleepSchedule"
                  value={formData.sleepSchedule}
                  onChange={(e) => setFormData({ ...formData, sleepSchedule: e.target.value })}
                  placeholder="Ex: 13h00 - 15h00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredFoods">Alimentos preferidos / recusados</Label>
                <Textarea
                  id="preferredFoods"
                  value={formData.preferredFoods}
                  onChange={(e) => setFormData({ ...formData, preferredFoods: e.target.value })}
                  placeholder="Descreva os alimentos que a criança prefere ou recusa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="separationReaction">Como reage a separações dos pais?</Label>
                <Textarea
                  id="separationReaction"
                  value={formData.separationReaction}
                  onChange={(e) => setFormData({ ...formData, separationReaction: e.target.value })}
                  placeholder="Descreva como a criança reage quando separada dos pais"
                />
              </div>

              <div className="space-y-2">
                <Label>Gosta de brincar com outras crianças?</Label>
                <RadioGroup
                  value={formData.playsWithOthers}
                  onValueChange={(value) => setFormData({ ...formData, playsWithOthers: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Sim" id="play-sim" />
                    <Label htmlFor="play-sim" className="font-normal cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Não" id="play-nao" />
                    <Label htmlFor="play-nao" className="font-normal cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="behaviorNotes">Há algo importante que devemos saber sobre o comportamento da criança?</Label>
                <Textarea
                  id="behaviorNotes"
                  value={formData.behaviorNotes}
                  onChange={(e) => setFormData({ ...formData, behaviorNotes: e.target.value })}
                  rows={4}
                  placeholder="Informações adicionais sobre o comportamento da criança"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: School Information */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">5. Informações Escolares (para idades acima de 3 anos)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {showSchoolInfo ? (
                <>
                  <div className="space-y-2">
                    <Label>Já frequentou outro centro infantil ou creche?</Label>
                    <RadioGroup
                      value={formData.previouslyAttendedCenter}
                      onValueChange={(value) => setFormData({ ...formData, previouslyAttendedCenter: value })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Sim" id="prev-sim" />
                        <Label htmlFor="prev-sim" className="font-normal cursor-pointer">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Não" id="prev-nao" />
                        <Label htmlFor="prev-nao" className="font-normal cursor-pointer">Não</Label>
                      </div>
                    </RadioGroup>
                    {formData.previouslyAttendedCenter === 'Sim' && (
                      <Input
                        placeholder="Se sim, qual?"
                        value={formData.previousCenterName}
                        onChange={(e) => setFormData({ ...formData, previousCenterName: e.target.value })}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transferReason">Motivo da transferência</Label>
                    <Textarea
                      id="transferReason"
                      value={formData.transferReason}
                      onChange={(e) => setFormData({ ...formData, transferReason: e.target.value })}
                      placeholder="Descreva o motivo da transferência"
                    />
                  </div>
                </>
              ) : (
                <p className="text-gray-600 text-sm">
                  Esta seção é apenas para crianças com idade acima de 3 anos. A criança tem {calculateAge(formData.birthDate)} anos.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 6: Image Authorization */}
        {currentStep === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">6. Autorização de Uso de Imagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="authorize"
                    checked={formData.imageUsageAuthorized}
                    onCheckedChange={(checked) => setFormData({ ...formData, imageUsageAuthorized: checked === true })}
                  />
                  <Label htmlFor="authorize" className="font-normal cursor-pointer">
                    Autorizo que fotografias e vídeos da criança sejam utilizados para fins educativos e divulgação institucional (redes sociais, murais, relatórios).
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="not-authorize"
                    checked={!formData.imageUsageAuthorized}
                    onCheckedChange={(checked) => setFormData({ ...formData, imageUsageAuthorized: checked !== true })}
                  />
                  <Label htmlFor="not-authorize" className="font-normal cursor-pointer">
                    Não autorizo.
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Signature & Documents */}
        {currentStep === 7 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">7. Documentos Anexos e Assinatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="classId">Turma *</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) => setFormData({ ...formData, classId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClasses.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.min_age_months}-{classItem.max_age_months} meses)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Documentos Anexos (para conferência)</h3>
                <div className="space-y-4">
                  {[
                    { key: 'birthCertificate', label: 'Cópia da certidão de nascimento', accept: '.pdf,.jpg,.jpeg,.png' },
                    { key: 'guardianId', label: 'Cópia do BI do encarregado', accept: '.pdf,.jpg,.jpeg,.png' },
                    { key: 'proofOfResidence', label: 'Comprovativo de residência', accept: '.pdf,.jpg,.jpeg,.png' },
                    { key: 'childPhoto', label: '1 foto tipo passe da criança', accept: '.jpg,.jpeg,.png' },
                    { key: 'vaccinationRecord', label: 'Boletim de vacinas atualizado', accept: '.pdf,.jpg,.jpeg,.png' },
                  ].map((doc) => {
                    const docKey = doc.key as keyof typeof formData.documents;
                    const docData = formData.documents[docKey];
                    const hasFile = docData?.file !== null;

                    return (
                      <div key={doc.key} className={`space-y-2 border rounded-lg p-4 ${hasFile ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <Label htmlFor={`file-${doc.key}`} className="text-sm font-medium">
                              {doc.label}
                            </Label>
                            {hasFile ? (
                              <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                                <File className="w-4 h-4" />
                                <span className="truncate font-medium">{docData.file?.name}</span>
                                <span className="text-xs text-green-600">
                                  ({formatFileSize(docData.file?.size || 0)})
                                </span>
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-gray-500">Nenhum arquivo selecionado</p>
                            )}
                          </div>
                          {hasFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  documents: {
                                    ...formData.documents,
                                    [docKey]: { file: null, verified: false },
                                  },
                                });
                                // Reset file input
                                const fileInput = document.getElementById(`file-${doc.key}`) as HTMLInputElement;
                                if (fileInput) fileInput.value = '';
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="flex-1 w-full">
                            <div className="relative">
                              <Input
                                id={`file-${doc.key}`}
                                type="file"
                                accept={doc.accept}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setFormData({
                                      ...formData,
                                      documents: {
                                        ...formData.documents,
                                        [docKey]: { file, verified: docData?.verified || false },
                                      },
                                    });
                                  }
                                }}
                                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`verified-${doc.key}`}
                              checked={docData?.verified || false}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  documents: {
                                    ...formData.documents,
                                    [docKey]: { file: docData?.file || null, verified: checked === true },
                                  },
                                })
                              }
                              disabled={!hasFile}
                            />
                            <Label htmlFor={`verified-${doc.key}`} className={`text-xs cursor-pointer ${hasFile ? 'text-gray-700' : 'text-gray-400'}`}>
                              Verificado
                            </Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signature">Assinatura do Encarregado *</Label>
                  <Input
                    id="signature"
                    value={formData.signature}
                    onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                    placeholder="Nome completo do responsável"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enrollmentDate">Data *</Label>
                  <Input
                    id="enrollmentDate"
                    type="date"
                    value={formData.enrollmentDate}
                    onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm text-center space-y-1">
                <p><strong>Localização:</strong> Bairro 1 de Maio- Khongolote</p>
                <p><strong>Contactos:</strong> 846796583 & 860045779</p>
                <p><strong>E-mail:</strong> sonhodecriancacentroinfantil@gmail.com</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          {currentStep < TOTAL_STEPS ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!isStepValid(currentStep) || !formData.classId}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submeter Questionário
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

