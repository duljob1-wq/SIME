import { getTrainingById, getResponses, getSettings, saveTraining } from './storageService';

export const checkAndSendAutoReport = async (trainingId: string, facilitatorId: string, facilitatorName: string) => {
    const training = getTrainingById(trainingId);
    if (!training || !training.targets || training.targets.length === 0) return;

    // Find the facilitator in the training to get WhatsApp number
    const facilitator = training.facilitators.find(f => f.id === facilitatorId);
    if (!facilitator || !facilitator.whatsapp) {
        console.log("AutoReport: Facilitator not found or no WhatsApp number.");
        return;
    }

    // Get All responses for this training
    const allResponses = getResponses(trainingId);
    
    // Filter for this specific facilitator
    const facResponses = allResponses.filter(r => 
        r.type === 'facilitator' && 
        (r.targetName === facilitatorName || (r.targetName && r.targetName.includes(facilitatorName)))
    );

    const count = facResponses.length;
    console.log(`AutoReport Check: Count ${count}, Targets: ${training.targets.join(', ')}`);

    // Check if current count matches any target
    if (training.targets.includes(count)) {
        const reportKey = `${facilitatorId}_${count}`; // Unique key for log
        
        // Initialize reportedTargets map if not exists
        if (!training.reportedTargets) training.reportedTargets = {};

        // Check if already sent
        if (training.reportedTargets[reportKey]) {
            console.log(`AutoReport: Report for target ${count} already sent to ${facilitatorName}.`);
            return;
        }

        // --- PREPARE MESSAGE ---
        const settings = getSettings();
        const stats = calculateStats(facResponses, training.facilitatorQuestions);
        const overall = calculateOverallStats(facResponses, training.facilitatorQuestions);
        
        let message = `*${settings.waHeader}*\n`;
        message += `--------------------------\n`;
        message += `Yth. ${facilitator.name}\n`;
        message += `Pelatihan: ${training.title}\n`;
        message += `Jumlah Responden: ${count} orang\n\n`;
        
        message += `*Ringkasan Nilai:*\n`;
        stats.forEach(s => {
            message += `- ${s.label}: *${s.value}*\n`;
        });

        // Add Overall Stats Section
        message += `\n*Rata-rata Keseluruhan:*\n`;
        if (overall.hasStar) {
            message += `⭐ Bintang: *${overall.starAvg}/5.0*\n`;
        }
        if (overall.hasSlider) {
            message += `📊 Skala: *${overall.sliderAvg}/100*\n`;
        }

        message += `\n${settings.waFooter}\n`;
        message += `(Sistem Evaluasi Pelatihan)`;

        // --- SEND VIA FONNTE ---
        try {
            const formData = new FormData();
            formData.append('target', facilitator.whatsapp);
            formData.append('message', message);
            formData.append('countryCode', '62'); 

            const response = await fetch(settings.waBaseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': settings.waApiKey,
                },
                body: formData
            });

            const result = await response.json();
            console.log('Fonnte Response:', result);

            if (result.status) {
                // Mark as sent
                training.reportedTargets[reportKey] = true;
                saveTraining(training); // Save the log back to storage
                console.log(`AutoReport: SUCCESS sent to ${facilitator.name}`);
            } else {
                console.error('AutoReport: Fonnte API Error', result);
            }

        } catch (error) {
            console.error('AutoReport: Network Error', error);
        }
    }
};

const calculateStats = (responses: any[], questions: any[]) => {
    return questions.map(q => {
        if (q.type === 'text') return { label: q.label, value: 'Isian Teks' };
        
        const valid = responses.filter((r: any) => typeof r.answers[q.id] === 'number');
        if (valid.length === 0) return { label: q.label, value: '0.0' };
        
        const sum = valid.reduce((a: number, b: any) => a + (b.answers[q.id] as number), 0);
        const avg = (sum / valid.length).toFixed(2);
        
        const display = q.type === 'star' ? `${avg}/5.0` : `${avg}/100`;
        return { label: q.label, value: display };
    });
};

const calculateOverallStats = (items: any[], qs: any[]) => {
    // Star
    const starQs = qs.filter((q: any) => q.type === 'star');
    let starAvg = 0;
    if (starQs.length > 0) {
        let totalScore = 0;
        let totalCount = 0;
        starQs.forEach((q: any) => {
           const valid = items.filter((r: any) => typeof r.answers[q.id] === 'number');
           if(valid.length) {
               totalScore += valid.reduce((a: number,b: any) => a + (b.answers[q.id] as number), 0);
               totalCount += valid.length;
           }
        });
        starAvg = totalCount ? Number((totalScore / totalCount).toFixed(2)) : 0;
    }

    // Slider
    const sliderQs = qs.filter((q: any) => q.type === 'slider');
    let sliderAvg = 0;
    if (sliderQs.length > 0) {
        let totalScore = 0;
        let totalCount = 0;
        sliderQs.forEach((q: any) => {
           const valid = items.filter((r: any) => typeof r.answers[q.id] === 'number');
           if(valid.length) {
               totalScore += valid.reduce((a: number,b: any) => a + (b.answers[q.id] as number), 0);
               totalCount += valid.length;
           }
        });
        sliderAvg = totalCount ? Number((totalScore / totalCount).toFixed(2)) : 0;
    }
    return { starAvg, sliderAvg, hasStar: starQs.length > 0, hasSlider: sliderQs.length > 0 };
};